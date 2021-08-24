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
						<g id="violins"></g>
					</g>
				</svg>
				<div id="rightColumn_bioActivity" class="rightColumn">
					<div id="dataPoints-div class="flex-table">
						<label>Displayed Values</label>
						<div id="dataPoints-table">
							<div id="visuals-violin" class="flex-row">
								<input type="checkbox" class="row-checkbox" id="cb-present" value="P" checked></input>
								<label class="row-label">Present (P)</label>
							</div>
							<div id="visuals-violin" class="flex-row">
								<input type="checkbox" class="row-checkbox" id="cb-marginal" value="M" checked></input>
								<label class="row-label">Marginal(M)</label>
							</div>
							<div id="visuals-violin" class="flex-row" disabled>
								<input type="checkbox" class="row-checkbox" id="cb-absent" value="A" ></input>
								<label class="row-label">Absent (A)</label>
							</div>
						</div>
					</div>
					<div id="visuals-div" class="flex-table">
						<label>Other Visuals</label>
						<div id="visuals-table">
							<div id="visuals-violin" class="flex-row">
								<input type="checkbox" id="cb-violin"></input>
								<label class="row-label">Violin plot</label>
							</div>
							<div id="visuals-jitter" class="flex-row">
								<input type="checkbox" id="cb-jitter"></input>
								<label class="row-label">Jitter</label>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	`;
	
}

export { main };