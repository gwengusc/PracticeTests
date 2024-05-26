import { CfnOutput, RemovalPolicy, Stack, type Stage, type StackProps } from 'aws-cdk-lib'
import type { Construct } from 'constructs'
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment'
import { S3Origin } from 'aws-cdk-lib/aws-cloudfront-origins'
import { BlockPublicAccess, Bucket } from 'aws-cdk-lib/aws-s3'
import { Distribution, ViewerProtocolPolicy } from 'aws-cdk-lib/aws-cloudfront'
import { ALIAS } from '../common/config.json'

const path = './resources/build'

export class ClientStack extends Stack {
  constructor (scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props)
    const stage = scope as Stage
    const stageName = stage.stageName
    // deploy react
    console.log('Current stage name: ' + stageName)

    const hostingBucket = new Bucket(this, `ClientResourceBucket-${stageName}${ALIAS}`, {
      autoDeleteObjects: true,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.DESTROY
    })

    const distribution = new Distribution(this, `CloudfrontDistribution-${stageName}${ALIAS}`, {
      defaultBehavior: {
        origin: new S3Origin(hostingBucket),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html'
        }
      ]
    })

    new BucketDeployment(this, `BucketDeployment-${stageName}${ALIAS}`, {
      sources: [Source.asset(path + `-${stageName.toLowerCase()}`)],
      destinationBucket: hostingBucket,
      distribution,
      distributionPaths: ['/*']
    })

    new CfnOutput(this, `CloudFrontURL-${stageName}${ALIAS}`, {
      value: distribution.domainName,
      description: 'The distribution URL in stage ' + stageName,
      exportName: `CloudFrontURL-${stageName}${ALIAS}`
    })

    new CfnOutput(this, `BucketName-${stageName}${ALIAS}`, {
      value: hostingBucket.bucketName,
      description: 'The name of the S3 bucket',
      exportName: `BucketName-${stageName}${ALIAS}`
    })
  }
}
