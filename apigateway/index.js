/**
 * Created by Pedro on 3/29/2017.
 */

import APIGatewayClient from './APIGatewayClient'
import Utils from './Utils'
import SigV4Client from './SigV4Client'
import SimpleHttpClient from './SimpleHttpClient'
import {uritemplate} from './url-template'

const apiGateway = {
  core: {
    apiGatewayClientFactory: {
      newClient: function(simpleHttpClientConfig, sigV4ClientConfig) {
        return new APIGatewayClient(simpleHttpClientConfig, sigV4ClientConfig)
      }
    },
    utils: new Utils()
  }
}

export {apiGateway, APIGatewayClient, Utils, SigV4Client, SimpleHttpClient, uritemplate}