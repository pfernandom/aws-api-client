var should = require("should");  
var APIGatewayClient = require("./lib/index").APIGatewayClient

describe('server', function () {
	 it('should respond to GET',function(){
		should.exist(APIGatewayClient);
	 });
});