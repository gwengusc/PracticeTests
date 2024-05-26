import { Stack, type StackProps, type Stage } from 'aws-cdk-lib'
import { type Construct } from 'constructs'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import { ALIAS } from '../common/config.json'

export class VpcStack extends Stack {
  readonly serverVpc: ec2.Vpc
  readonly webSecurityGroup: ec2.SecurityGroup
  readonly lbSecurityGroup: ec2.SecurityGroup

  constructor (scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props)

    const stage = scope as Stage
    const stageName = stage.stageName
    /*
      Create a VPC with three subnets, spread across two AZs:
      1. Private subnet with route to NAT Gateway for the webinstances
      2. Private subnet without NAT Gateway (isolated) for the database instance
      3. Public subnet with Internet Gateway + NAT Gateway for public access for ALB and NAT Gateway access from Web instances

      Store VPC flow logs in the encrypted bucket we created above
    */
    this.serverVpc = new ec2.Vpc(this, `server-vpc-${stageName}${ALIAS}`, {
      natGateways: 1,
      maxAzs: 2,
      subnetConfiguration: [
        {
          name: 'private-with-nat',
          subnetType: ec2.SubnetType.PRIVATE_WITH_NAT
        },
        {
          name: 'private-isolated',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED
        },
        {
          name: 'public',
          subnetType: ec2.SubnetType.PUBLIC
        }
      ]
    })

    // Create Security Group for load balancer
    this.lbSecurityGroup = new ec2.SecurityGroup(this, `LbSecurityGroup-${stageName}${ALIAS}`, {
      vpc: this.serverVpc,
      description: `Security Group for the Load Balancer in ${stageName}${ALIAS}`,
      securityGroupName: `lb-security-group-name-${stageName}${ALIAS}`,
      allowAllOutbound: false
    })

    // Determine if HTTP or HTTPS port should be used for LB
    const lbPort = 443

    // Allow Security Group outbound traffic for load balancer
    this.lbSecurityGroup.addEgressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(lbPort),
          `Allow outgoing traffic over port ${lbPort}`
    )

    // Allow Security Group inbound traffic for load balancer
    this.lbSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(lbPort),
          `Allow incoming traffic over port ${lbPort}`
    )

    // Create Security Group for web instances
    this.webSecurityGroup = new ec2.SecurityGroup(this, `WebSecurityGroup-${stageName}${ALIAS}`, {
      vpc: this.serverVpc,
      description: `Security Group for the Web instances ${stageName}${ALIAS}`,
      securityGroupName: `web-security-group-${stageName}${ALIAS}`,
      allowAllOutbound: false
    })

    // Allow Security Group outbound traffic over port 80 instances
    this.webSecurityGroup.addEgressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      'Allow outgoing traffic over port 80'
    )

    // Allow Security Group inbound traffic over port 80 from the Load Balancer security group
    this.webSecurityGroup.connections.allowFrom(
      new ec2.Connections({
        securityGroups: [this.lbSecurityGroup]
      }),
      ec2.Port.tcp(80)
    )
  }
}
