import { Stage } from 'aws-cdk-lib'
import type { StageProps } from 'aws-cdk-lib'
import type { Construct } from 'constructs'
import { ClientStack } from './client-stack'
import { ServerStack } from './server-stack'
import { VpcStack } from './vpc-stack'
import { ALIAS } from '../common/config.json'

// Main deployment setup. Collection of the stacks and deployment sequence
export class Deployment extends Stage {
  constructor (scope: Construct, id: string, props?: StageProps) {
    super(scope, id, props)
    console.log(this.stageName)

    const vpcStack = new VpcStack(this, `VpcStack${ALIAS}`, {
      description: 'This is vpc stack in ' + this.stageName + ' stage.',
      env: props?.env
    })

    // Deploy server stack in the Deployment stage
    new ServerStack(this, `ServerStack${ALIAS}`, {
      vpc: vpcStack.serverVpc,
      webSecurityGroup: vpcStack.webSecurityGroup,
      lbSecurityGroup: vpcStack.lbSecurityGroup,
      description: 'This is server stack in ' + this.stageName + ' stage.',
      env: props?.env
    })

    // Deploy client stack in the Deployment stage
    new ClientStack(this, `ClientStack${ALIAS}`, {
      description: 'This is client stack with IaC in ' + this.stageName + ' stage.',
      env: props?.env
    })
  }
}
