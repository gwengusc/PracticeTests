// import {SERVER_URLS} from "./generated/config"
import CONFIG from './generated/config.json'

// const serverUrl = "https://practice-tests-backend-manual.us-west-2.elasticbeanstalk.com"
const stage = process.env.REACT_APP_STAGE??'local'
let url = 'http://localhost:8080'

if (stage !== 'local'){
    const domain = CONFIG.ELASTIC_BEANSTALK_DOMAIN
    const region = CONFIG.ENV.region
    const cnamePrefixes = CONFIG.SERVER_URL_CNAME_PREFIXES as {[key: string]: string}
    const cnamePrefix = cnamePrefixes[stage]
    url = `https//${cnamePrefix}${CONFIG.ALIAS}.${region}.${domain}`
}

console.log(`${url}/user`)
const greetingAPI = {
    get() {
        return fetch(`${url}/user`)
            .then((response: any)=>{
                console.log(response)
                return response
            }).then((response: Response)=>{
                let a = response.json()
                return a
            }).then((a:any)=>{
                console.log(a)
                console.log(a.name)
            })
    }
}

export {greetingAPI}