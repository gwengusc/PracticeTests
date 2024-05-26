import { Repository } from 'aws-cdk-lib/aws-codecommit'
import { BuildSpec, LinuxBuildImage } from 'aws-cdk-lib/aws-codebuild'
import { PolicyStatement } from 'aws-cdk-lib/aws-iam'
import { CodeBuildStep, CodePipeline, CodePipelineSource, ShellStep } from 'aws-cdk-lib/pipelines'
import { CfnOutput, Stack } from 'aws-cdk-lib'
import type { StackProps } from 'aws-cdk-lib'
import type { Construct } from 'constructs'
import { Deployment } from './stages'
import { ENV, ALIAS } from '../common/config.json'

export class CodePipelineStack extends Stack {
  constructor (scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props)
    const repo = new Repository(this, `Repository${ALIAS}`, {
      repositoryName: 'PracticeTests',
      description: 'This is the repository for the project PracticeTests.'
    })

    const validatePolicy = new PolicyStatement({
      actions: [
        'cloudformation:DescribeStacks'
      ],
      resources: ['*']
    })

    const buildImage = LinuxBuildImage.fromCodeBuildImageId('aws/codebuild/amazonlinux2-x86_64-standard:5.0')

    const pipeline = new CodePipeline(this, `Pipeline${ALIAS}`, {
      synth: new ShellStep(`Synth${ALIAS}`, {
        input: CodePipelineSource.codeCommit(repo, 'master'),
        installCommands: [
          'make warming'
        ],
        commands: [
          'make build'
        ],
        primaryOutputDirectory: 'infra/cdk.out'
      }),

      synthCodeBuildDefaults: {
        buildEnvironment: {
          buildImage
        }
      },
      codeBuildDefaults: {
        buildEnvironment: {
          buildImage
        }
      }
    })

    // Add dev deployment
    const devStage = new Deployment(this, `Dev${ALIAS}`, { env: ENV })
    pipeline.addStage(devStage, {
      // Execute all sequence of actions before deployment
      pre: [
        new CodeBuildStep(`Linting${ALIAS}`, {
          installCommands: [
            'make warming'
          ],
          commands: [
            'make linting'
          ]
        }),
        new CodeBuildStep(`UnitTest${ALIAS}`, {
          installCommands: [
            'make warming'
          ],
          commands: [
            'make unittest'
          ],
          partialBuildSpec: BuildSpec.fromObject({
            reports: {
              coverage: {
                files: [
                  './infra/coverage/clover.xml'
                ],
                'file-format': 'CLOVERXML'
              },
              unittest: {
                files: [
                  './infra/test-report.xml'
                ],
                'file-format': 'JUNITXML'
              }
            }
          }),
          rolePolicyStatements: [
            new PolicyStatement({
              actions: [
                'codebuild:CreateReportGroup',
                'codebuild:CreateReport',
                'codebuild:UpdateReport',
                'codebuild:BatchPutTestCases',
                'codebuild:BatchPutCodeCoverages'
              ],
              resources: ['*']
            })
          ]
        }),
        new CodeBuildStep(`Security${ALIAS}`, {
          installCommands: [
            'make warming',
            'gem install cfn-nag'
          ],
          commands: [
            'make build',
            'make security'
          ],
          buildEnvironment: {
            buildImage
          }
        })
      ],
      // Execute validation check for post-deployment
      post: [
        new CodeBuildStep(`Validate${ALIAS}`, {
          env: {
            STAGE: devStage.stageName
          },
          installCommands: [
            'make warming'
          ],
          commands: [
            'make validate'
          ],
          rolePolicyStatements: [validatePolicy]
        })
      ]
    })
    // Add test deployment
    const testStage = new Deployment(this, `Test${ALIAS}`, { env: ENV })
    pipeline.addStage(testStage, {
      // Execute validation check for post-deployment
      post: [
        new CodeBuildStep(`Validate${ALIAS}`, {
          env: {
            STAGE: testStage.stageName
          },
          installCommands: [
            'make warming'
          ],
          commands: [
            'make validate'
          ],
          rolePolicyStatements: [validatePolicy]
        })
      ]
    })
    // Add prod deployment
    const prodStage = new Deployment(this, `Prod${ALIAS}`, { env: ENV })
    pipeline.addStage(prodStage, {
      // Execute validation check for post-deployment
      post: [
        new CodeBuildStep(`Validate${ALIAS}`, {
          env: {
            STAGE: prodStage.stageName
          },
          installCommands: [
            'make warming'
          ],
          commands: [
            'make validate'
          ],
          rolePolicyStatements: [validatePolicy]
        })
      ]
    })
    // Output
    new CfnOutput(this, `RepositoryName${ALIAS}`, {
      value: repo.repositoryName
    })
  }
}
