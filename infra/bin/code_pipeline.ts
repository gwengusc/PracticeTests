#!/usr/bin/env node
import 'source-map-support/register'
import * as cdk from 'aws-cdk-lib'
import { CodePipelineStack } from '../lib/pipeline-stack'
import { ALIAS, ENV } from '../common/config.json'

const app = new cdk.App()
new CodePipelineStack(app, `CodePipeline${ALIAS}`, { env: ENV })
