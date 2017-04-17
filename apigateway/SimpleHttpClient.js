/**
 * Created by Pedro on 3/29/2017.
 */
import Utils from './Utils'
import axios from 'axios'

export default class SimpleHttpClient {
	constructor(config) {
		this.config = config;
		this.utils = new Utils();
		this.endpoint = this.utils.assertDefined(config.endpoint, 'endpoint');
	}

	buildCanonicalQueryString(queryParams) {
		//Build a properly encoded query string from a QueryParam object
		if (Object.keys(queryParams).length < 1) {
			return '';
		}

		var canonicalQueryString = '';
		for (var property in queryParams) {
			if (queryParams.hasOwnProperty(property)) {
				canonicalQueryString += encodeURIComponent(property) + '=' + encodeURIComponent(queryParams[property]) + '&';
			}
		}

		return canonicalQueryString.substr(0, canonicalQueryString.length - 1);
	}

	makeRequest(request) {
		var verb = this.utils.assertDefined(request.verb, 'verb');
		var path = this.utils.assertDefined(request.path, 'path');
		var queryParams = this.utils.copy(request.queryParams);
		if (queryParams === undefined) {
			queryParams = {};
		}
		var headers = this.utils.copy(request.headers);
		if (headers === undefined) {
			headers = {};
		}

		//If the user has not specified an override for Content type the use default
		if (headers['Content-Type'] === undefined) {
			headers['Content-Type'] = config.defaultContentType;
		}

		//If the user has not specified an override for Accept type the use default
		if (headers['Accept'] === undefined) {
			headers['Accept'] = config.defaultAcceptType;
		}

		var body = this.utils.copy(request.body);
		if (body === undefined) {
			body = '';
		}

		var url = config.endpoint + path;
		var queryString = buildCanonicalQueryString(queryParams);
		if (queryString != '') {
			url += '?' + queryString;
		}
		var simpleHttpRequest = {
			method: verb,
			url: url,
			headers: headers,
			data: body
		};
		return axios(simpleHttpRequest);
	}
}