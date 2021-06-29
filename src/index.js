'use strict';
import { GeneExpressionGraph } from './GeneExpressionGraph.js';

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
		window.GeneExpressionGraph = new GeneExpressionGraph(rows[0]);
	});
	// create the top-level container for the graph
	el.innerHTML = `
		<div class="rootContainer">
			<div id="geneExpressionGraph-div" class="targetmineGraphDisplayer" >
				<svg id="canvas_geneExpression" class="targetmineGraphSVG">
					<g id="graph">
						<text id="left-axis-label" transform="rotate(-90)">
							Human Body Index Gene Exp. Level
						</text>
						<g id="points"></g>
					</g>
				</svg>
				<div id="rightColumn_bioActivity" className="rightColumn">
					<div id="visuals-div" className="flex-table">
						<label>Other Visuals</label>
						<div id="visuals-table">
							<div id="visuals-violin" className="flex-row">
								<input type="checkbox" id="cb-violin"></input>
								<label className="row-label">Violin plot</label>
							</div>
							<div id="visuals-jitter" className="flex-row">
								<input type="checkbox" id="cb-jitter"></input>
								<label className="row-label">Jitter</label>
							</div>
						</div>
					</div>
				</div>
				<div id="modal_bioActivity" className="targetmineGraphModal"></div>
			</div>
		</div>
	`;
	
}

export { main };