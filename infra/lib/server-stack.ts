import { RemovalPolicy, Stack, type StackProps, type Stage } from 'aws-cdk-lib'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as elasticbeanstalk from 'aws-cdk-lib/aws-elasticbeanstalk'
import * as iam from 'aws-cdk-lib/aws-iam'
import { type Construct } from 'constructs'
import { SERVER_URL_CNAME_PREFIXES, ALIAS } from '../common/config.json'
import { BlockPublicAccess, Bucket } from 'aws-cdk-lib/aws-s3'
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment'

export interface ServerStackProps extends StackProps {
  readonly vpc: ec2.Vpc
  readonly lbSecurityGroup: ec2.SecurityGroup
  readonly webSecurityGroup: ec2.SecurityGroup
}

export class ServerStack extends Stack {
  constructor (scope: Construct, id: string, props: ServerStackProps) {
    super(scope, id, props)

    const stage = scope as Stage
    const stageName = stage.stageName
    const vpc = props.vpc

    const sslCertificateARN =
        'arn:aws:acm:us-west-2:757915757837:certificate/848f7b7a-17ae-439c-a88c-f1fb4a58c4e6'

    console.log('Configuration settings: ', props)

    const serverResourceBucket = new Bucket(this, `ServerResourceBucket-${stageName}${ALIAS}`, {
      autoDeleteObjects: true,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.DESTROY
    })

    const appDeployment = new BucketDeployment(this, `ServerBucketDeployment-${stageName}${ALIAS}`, {
      sources: [Source.asset('../server/target/source-bundle.zip')],
      destinationBucket: serverResourceBucket
    })

    // Define a new Elastic Beanstalk application
    const applicationName = `ServerSpringBootApp-${stageName}${ALIAS}`
    const app = new elasticbeanstalk.CfnApplication(this, applicationName, {
      applicationName
    })

    // Create role for the web-instances
    const webtierRole = new iam.Role(this, `WebtierRole-${stageName}${ALIAS}`, {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com')
    })

    // Add a managed policy for the ELastic Beanstalk web-tier to the webTierRole
    const managedPolicy = iam.ManagedPolicy.fromAwsManagedPolicyName('AWSElasticBeanstalkWebTier')
    webtierRole.addManagedPolicy(managedPolicy)

    // Create an instance profile for the web-instance role
    const ec2InstanceProfile = new iam.CfnInstanceProfile(this, `EC2WebInstanceProfile-${stageName}${ALIAS}`, {
      roles: [webtierRole.roleName]
    })

    /*
          CREATING THE ELASTIC BEANSTALK APPLICATION
        */

    // Get the public and private subnets to deploy Elastic Beanstalk ALB and web servers in.
    const publicSubnets = vpc.selectSubnets({ subnetType: ec2.SubnetType.PUBLIC }).subnets
    const privateWebSubnets = vpc.selectSubnets({ subnetType: ec2.SubnetType.PRIVATE_WITH_NAT }).subnets

    // A helper function to create a comma separated string from subnets ids
    const createCommaSeparatedList = function (subnets: ec2.ISubnet[]): string {
      return subnets.map((subnet: ec2.ISubnet) => subnet.subnetId).toString()
    }

    const webserverSubnets = createCommaSeparatedList(privateWebSubnets)
    const lbSubnets = createCommaSeparatedList(publicSubnets)

    // Define settings for the Elastic Beanstalk application
    // Documentation for settings: https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/command-options-general.html
    const ebSettings = [
      ['aws:elasticbeanstalk:environment', 'LoadBalancerType', 'application'], // Set the load balancer type (e.g. 'application' for ALB)
      ['aws:autoscaling:launchconfiguration', 'InstanceType', 't2.micro'], // Set instance type for web tier
      ['aws:autoscaling:launchconfiguration', 'IamInstanceProfile', ec2InstanceProfile.attrArn], // Set IAM Instance Profile for web tier
      ['aws:autoscaling:launchconfiguration', 'SecurityGroups', props.webSecurityGroup.securityGroupId], // Set Security Group for web tier
      ['aws:ec2:vpc', 'VPCId', vpc.vpcId], // Deploy resources in VPC created earlier
      ['aws:ec2:vpc', 'Subnets', webserverSubnets], // Deploy Web tier instances in private subnets
      ['aws:ec2:vpc', 'ELBSubnets', lbSubnets], // Deploy Load Balancer in public subnets
      ['aws:elbv2:loadbalancer', 'SecurityGroups', props.lbSecurityGroup.securityGroupId], // Attach Security Group to Load Balancer
      ['aws:elasticbeanstalk:cloudwatch:logs', 'StreamLogs', 'true'], // Whether or not to stream logs to CloudWatch
      ['aws:elasticbeanstalk:cloudwatch:logs', 'DeleteOnTerminate', 'false'], // Whether or not to delete log groups when Elastic Beanstalk environment is terminated
      ['aws:elasticbeanstalk:cloudwatch:logs', 'RetentionInDays', '7'], // Number of days logs should be retained
      ['aws:elasticbeanstalk:hostmanager', 'LogPublicationControl', 'true'], // Enable Logging to be stored in S3
      ['aws:elasticbeanstalk:application:environment', 'REGION', this.region], // Define Env Variable for Region
      ['aws:elasticbeanstalk:application:environment', 'SERVER_PORT', '5000'], // Define Env Variable for Port of listening
      ['aws:elasticbeanstalk:application:environment', 'STAGE_NAME', stageName.toLowerCase()], // Define Env Variable for Port of listening
      ['aws:elasticbeanstalk:application', 'Application Healthcheck URL', '/health'], // Define Env Variable for Region
      ['aws:elasticbeanstalk:environment:process:default', 'HealthCheckPath', '/health'], // Define Env Variable for Region
      ['aws:elbv2:listener:default', 'ListenerEnabled', 'false'], // Disable the default HTTP listener
      ['aws:elbv2:listener:443', 'ListenerEnabled', 'true'], // Create a new HTTPS listener on port 443
      ['aws:elbv2:listener:443', 'SSLCertificateArns', sslCertificateARN], // Attach the certificate for the custom domain
      ['aws:elbv2:listener:443', 'SSLPolicy', 'ELBSecurityPolicy-FS-1-2-Res-2020-10'], // Specifies the TLS policy
      ['aws:elbv2:listener:443', 'Protocol', 'HTTPS'] // Sets the protocol for the listener to HTTPS
    ]

    /* Map settings created above, to the format required for the Elastic Beanstalk OptionSettings
          [
            {
            namespace: "",
            optionName: "",
            value: ""
            },
            ....
          ]
        */
    const optionSettingProperties: elasticbeanstalk.CfnEnvironment.OptionSettingProperty[] = ebSettings.map(
      setting => ({ namespace: setting[0], optionName: setting[1], value: setting[2] })
    )

    // Create an app version based on the sample application (from https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/nodejs-getstarted.html)
    const appVersionProps = new elasticbeanstalk.CfnApplicationVersion(this, `EBAppVersion-${stageName}${ALIAS}`, {
      applicationName,
      sourceBundle: { // s3 BucketDeployment is not able to handle jar file, jar file is uploaded manually.
        s3Bucket: serverResourceBucket.bucketName,
        s3Key: 'target/server-0.0.1-SNAPSHOT.jar'
      }
    })

    // Create Elastic Beanstalk environment
    new elasticbeanstalk.CfnEnvironment(this, `EBEnvironment-${stageName}${ALIAS}`, {
      applicationName,
      // solutionStackName: '64bit Amazon Linux 2 v3.5.1 running Corretto 11',
      solutionStackName: '64bit Amazon Linux 2023 v4.0.1 running Corretto 17',
      cnamePrefix: `${(SERVER_URL_CNAME_PREFIXES as Record<string, string>)[stageName.toLowerCase()]}${ALIAS}`,
      versionLabel: appVersionProps.ref,
      optionSettings: optionSettingProperties
    })

    appVersionProps.node.addDependency(appDeployment)
    appVersionProps.addDependsOn(app)
  }
}
