'use strict';
const GeneExpressionGraph = require('./GeneExpressionGraph.js');

// make sure to export main, with the signature
function main(el, service, imEntity, state, config) {
	if (!state) state = {};
	if (!el || !service || !imEntity || !state || !config) {
		throw new Error('Call main with correct signature');
	}
	// define the TargetMine service
	let tmService = new imjs.Service(service);
	tmService.fetchModel().then(model => {
		// retrieve the data from TargetMine using a predefined query
		let query = new imjs.Query({ model });
		// from 
		query.adjustPath('Gene');
		// select
		query.select([
			'Gene.primaryIdentifier',
			'Gene.symbol',
			'Gene.probeSets.probeSetId',
			'Gene.probeSets.expressions.tissue.category',
			'Gene.probeSets.expressions.tissue.organ',
			'Gene.probeSets.expressions.tissue.name',
			'Gene.probeSets.expressions.call',
			'Gene.probeSets.expressions.value'
		]);
		// where
		query.addConstraints([
			{
				path: 'id',
				op: '=',
				value: imEntity.Gene.value
			},
			{
				path: 'Gene.probeSets.expressions.tissue',
				type: 'HbiTissue'
			},
			{
				path: 'Gene.probeSets.expressions',
				type: 'HbiExpression'
			}
		]);
		return tmService.records(query); 
	}).then(rows => {
		window.GeneExpressionGraph = new GeneExpressionGraph(rows);
	});
	// create the top-level container for the graph
	el.innerHTML = `
		<div class="rootContainer">
			<h1>Your Data Viz Here</h1>
		</div>
	`;
	
}

module.export = main;