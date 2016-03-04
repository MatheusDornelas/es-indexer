var Async = require('async');
var Mysql = require('mysql');
var UuidBase26 = require('uuid-base62');
var Uuid = require('uuid');
var Elasticsearch = require('elasticsearch');

// Qual foi o ultimo id processado da tabela caso queira continuar de onde parou
var lastProcessed = 0;
// Colunas da tabela stats
//id int(11) - ID numérico autoincremental da tabela
//uuid binary(16) - UUID que identifica este evento
//device_id int(11)- ID numérico do device
//event text - Nome do evento que ocorreu no app, ex: 'simulado.concluido', 'questoes.corrigiu', etc
//params text - Parametros especificos do evento em json, no caso de 'questoes.corrigiu' pode ser { id_questao: 56, alternativa_marcada : 1 }
//time timestamp - Timestamp do horário que o evento ocorreu pelo celular do usuário
//create_date timestamp - Timestamp do horário em que o evento foi registrado no servidor

var select = 'SELECT * FROM stats201403 WHERE id > ' + lastProcessed + ' LIMIT 3;';

var elasticsearchClient = new Elasticsearch.Client({
	host: 'localhost:9200', // Substituir aqui os dados do servidor elasticsearch que estiver rodando
	log: 'trace'
});

// Conecta no BD do oab de bolso
var mysqlConnection = Mysql.createConnection({
	host: '5.9.51.215',
	port: 3306,
	user: 'elasticsearch',
	password: 'g6nvCL9bjeN6TU3F5c9kcEU9',
	database: 'oabdebolso'
});

mysqlConnection.connect();

var inicio = new Date().getTime();
mysqlConnection.query(select, function(err, rows, fields) {

	if (err) {
		throw err;
	}
	
	console.log('Received ' + rows.length + ' rows');
	
	var objects = [];
	for (x in rows){
		// O UUID no bd ta como binário, aqui vamos converter pra string
		var uuid = UuidBase26.encode(Uuid.unparse(rows[x].uuid));
		
		// Dá parse no json da coluna params
		var params = null;
		
		try {
			params = JSON.parse(rows[x].params);
		} catch (e) {
			params = null;
		}		
		var	objBody = {
			DeviceId: rows[x].device_id,
			event: rows[x].event,
			params: params,
			timestamp : new Date()
		};
		objects.push(objBody);
		lastProcessed = rows[x].id;
		//console.log(lastProcessed);
	}
	
	for(y in objects){
		elasticsearchClient.create({
		  index: 'stats',
		  type: 'events',
		  id: uuid,
		  body: objects[x]
		}).then(function (resp) {
			console.log('Objeto ', resp)
		}, function (err) {
			console.trace(err.message);
		});
	}

});

//mysqlConnection.end();
