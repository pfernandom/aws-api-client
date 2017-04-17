/**
 * Created by Pedro on 3/29/2017.
 */
import Utils from './Utils'
import axios from 'axios'
import CryptoJS from 'crypto-js'

const AWS_SHA_256 = 'AWS4-HMAC-SHA256';
const AWS4_REQUEST = 'aws4_request';
const AWS4 = 'AWS4';
const X_AMZ_DATE = 'x-amz-date';
const X_AMZ_SECURITY_TOKEN = 'x-amz-security-token';
const HOST = 'host';
const AUTHORIZATION = 'Authorization';

export default class SigV4Client {

	constructor(config) {
		this.config = config;
		this.utils = new Utils();

		this.accessKey = this.utils.assertDefined(config.accessKey, 'accessKey');
		this.secretKey = this.utils.assertDefined(config.secretKey, 'secretKey');
		this.sessionToken = config.sessionToken;
		this.serviceName = this.utils.assertDefined(config.serviceName, 'serviceName');
		this.region = this.utils.assertDefined(config.region, 'region');
		this.endpoint = this.utils.assertDefined(config.endpoint, 'endpoint');
	}

	hash(value) {
		return CryptoJS.SHA256(value);
	}

	hexEncode(value) {
		return value.toString(CryptoJS.enc.Hex);
	}

	hmac(secret, value) {
		return CryptoJS.HmacSHA256(value, secret, {asBytes: true});
	}

	buildCanonicalRequest(method, path, queryParams, headers, payload) {
		return method + '\n' +
			this.buildCanonicalUri(path) + '\n' +
			this.buildCanonicalQueryString(queryParams) + '\n' +
			this.buildCanonicalHeaders(headers) + '\n' +
			this.buildCanonicalSignedHeaders(headers) + '\n' +
			this.hexEncode(this.hash(payload));
	}

	hashCanonicalRequest(request) {
		return this.hexEncode(this.hash(request));
	}

	buildCanonicalUri(uri) {
		return encodeURI(uri);
	}

	buildCanonicalQueryString(queryParams) {
		if (Object.keys(queryParams).length < 1) {
			return '';
		}

		var sortedQueryParams = [];
		for (var property in queryParams) {
			if (queryParams.hasOwnProperty(property)) {
				sortedQueryParams.push(property);
			}
		}
		sortedQueryParams.sort();

		var canonicalQueryString = '';
		for (var i = 0; i < sortedQueryParams.length; i++) {
			canonicalQueryString += sortedQueryParams[i] + '=' + this.fixedEncodeURIComponent(queryParams[sortedQueryParams[i]]) + '&';
		}
		return canonicalQueryString.substr(0, canonicalQueryString.length - 1);
	}

	fixedEncodeURIComponent(str) {
		return encodeURIComponent(str).replace(/[!'()*]/g, function (c) {
			return '%' + c.charCodeAt(0).toString(16);
		});
	}

	buildCanonicalHeaders(headers) {
		var canonicalHeaders = '';
		var sortedKeys = [];
		for (var property in headers) {
			if (headers.hasOwnProperty(property)) {
				sortedKeys.push(property);
			}
		}
		sortedKeys.sort();

		for (var i = 0; i < sortedKeys.length; i++) {
			canonicalHeaders += sortedKeys[i].toLowerCase() + ':' + headers[sortedKeys[i]] + '\n';
		}
		return canonicalHeaders;
	}

	buildCanonicalSignedHeaders(headers) {
		var sortedKeys = [];
		for (var property in headers) {
			if (headers.hasOwnProperty(property)) {
				sortedKeys.push(property.toLowerCase());
			}
		}
		sortedKeys.sort();
		return sortedKeys.join(';');
	}

	buildStringToSign(datetime, credentialScope, hashedCanonicalRequest) {
		return AWS_SHA_256 + '\n' +
			datetime + '\n' +
			credentialScope + '\n' +
			hashedCanonicalRequest;
	}

	buildCredentialScope(datetime, region, service) {
		return datetime.substr(0, 8) + '/' + region + '/' + service + '/' + AWS4_REQUEST
	}

	calculateSigningKey(secretKey, datetime, region, service) {
		let hmac = this.hmac;
		return hmac(hmac(hmac(hmac(AWS4 + secretKey, datetime.substr(0, 8)), region), service), AWS4_REQUEST);
	}

	calculateSignature(key, stringToSign) {
		return this.hexEncode(this.hmac(key, stringToSign));
	}

	buildAuthorizationHeader(accessKey, credentialScope, headers, signature) {
		return AWS_SHA_256 + ' Credential=' + accessKey + '/' + credentialScope + ', SignedHeaders=' + this.buildCanonicalSignedHeaders(headers) + ', Signature=' + signature;
	}

	makeRequest(request) {
		var verb = this.utils.assertDefined(request.verb, 'verb');
		var path = this.utils.assertDefined(request.path, 'path');
		var config = this.config;
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
		if (body === undefined || verb === 'GET') { // override request body and set to empty when signing GET requests
			body = '';
		} else {
			body = JSON.stringify(body);
		}

		//If there is no body remove the content-type header so it is not included in SigV4 calculation
		if (body === '' || body === undefined || body === null) {
			delete headers['Content-Type'];
		}

		var datetime = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z').replace(/[:\-]|\.\d{3}/g, '');
		headers[X_AMZ_DATE] = datetime;
		var parser = document.createElement('a');
		parser.href = this.endpoint;
		headers[HOST] = parser.hostname;

		var canonicalRequest = this.buildCanonicalRequest(verb, path, queryParams, headers, body);
		var hashedCanonicalRequest = this.hashCanonicalRequest(canonicalRequest);
		var credentialScope = this.buildCredentialScope(datetime, this.region, this.serviceName);
		var stringToSign = this.buildStringToSign(datetime, credentialScope, hashedCanonicalRequest);
		var signingKey = this.calculateSigningKey(this.secretKey, datetime, this.region, this.serviceName);
		var signature = this.calculateSignature(signingKey, stringToSign);
		headers[AUTHORIZATION] = this.buildAuthorizationHeader(this.accessKey, credentialScope, headers, signature);
		if (this.sessionToken !== undefined && this.sessionToken !== '') {
			headers[X_AMZ_SECURITY_TOKEN] = this.sessionToken;
		}
		delete headers[HOST];

		var url = config.endpoint + path;
		var queryString = this.buildCanonicalQueryString(queryParams);
		if (queryString != '') {
			url += '?' + queryString;
		}

		//Need to re-attach Content-Type if it is not specified at this point
		if (headers['Content-Type'] === undefined) {
			headers['Content-Type'] = config.defaultContentType;
		}

		var signedRequest = {
			method: verb,
			url: url,
			headers: headers,
			data: body
		};
		return axios(signedRequest);
	};

}