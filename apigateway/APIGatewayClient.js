/**
 * Created by Pedro on 3/29/2017.
 */
import Utils from './Utils'
import SimpleHttpClient from './SimpleHttpClient'
import SigV4Client from './SigV4Client'

export default class APIGatewayClient{
	constructor(simpleHttpClientConfig, sigV4ClientConfig){
		this.utils = new Utils();
		this.sigV4Client = new SigV4Client(sigV4ClientConfig);
		this.simpleHttpClient = new SimpleHttpClient(simpleHttpClientConfig);
	}
	makeRequest(request, authType, additionalParams, apiKey) {
		//Default the request to use the simple http client
		var clientToUse = this.simpleHttpClient;

		//Attach the apiKey to the headers request if one was provided
		if (apiKey !== undefined && apiKey !== '' && apiKey !== null) {
			request.headers['x-api-key'] = apiKey;
		}

		if (request.body === undefined || request.body === '' || request.body === null || Object.keys(request.body).length === 0) {
			request.body = undefined;
		}

		// If the user specified any additional headers or query params that may not have been modeled
		// merge them into the appropriate request properties
		request.headers = this.utils.mergeInto(request.headers, additionalParams.headers);
		request.queryParams = this.utils.mergeInto(request.queryParams, additionalParams.queryParams);

		//If an auth type was specified inject the appropriate auth client
		if (authType === 'AWS_IAM') {
			clientToUse = this.sigV4Client;
		}

		//Call the selected http client to make the request, returning a promise once the request is sent
		return clientToUse.makeRequest(request);
	};
}