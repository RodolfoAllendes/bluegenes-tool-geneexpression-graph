'use strict';
import { GeneExpressionGraph } from './GeneExpressionGraph.js';

// make sure to export main, with the signature
function main(el, service, imEntity, state, config, navigate) {
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
		window.GeneExpressionGraph = new GeneExpressionGraph(rows[0], navigate);
	});
	// create the top-level container for the graph
	el.innerHTML = `
		<div class="rootContainer">
			<div id="geneExpressionGraph" class="targetMineGeneExpressionGraph" >
				
				<svg id="canvas_geneExpression" class="targetMineGeneExpressionGraphSVG">
					<g id="graph">
						<text id="left-axis-label" transform="rotate(-90)">
							Human Body Index Gene Exp. Level
						</text>
						<g id="points"></g>
						<g id="violins"></g>
					</g>
				</svg>
				
				<div id="rightColumn_bioActivity" class="rightColumn">
					
					<div id="dataPoints-div" class="flex-table">
						<h5 class="report-item-heading">Displayed Values</h5>
						<div id="points-present" class="flex-row">
							<input id="cb-present" type="checkbox" class="row-checkbox" value="P" checked></input>
							<label class="row-label">Present (P)</label>
						</div>
						<div id="points-marginal" class="flex-row">
							<input id="cb-marginal" type="checkbox" class="row-checkbox" value="M" checked></input>
							<label class="row-label">Marginal(M)</label>
						</div>
						<div id="points-absent" class="flex-row">
							<input id="cb-absent" type="checkbox" class="row-checkbox" value="A" ></input>
							<label class="row-label">Absent (A)</label>
						</div>
					</div>
					
					<div id="visuals-div" class="flex-table">
						<h5 class="report-item-heading">Add visual aids</h5>
						<div id="visuals-violin" class="flex-row">
							<input type="checkbox" id="cb-violin"></input>
							<label class="row-label">Violin plot</label>
						</div>
						<div id="visuals-jitter" class="flex-row">
							<input type="checkbox" id="cb-jitter"></input>
							<label class="row-label">Jitter</label>
						</div>
					</div>
					
					<div id="links-div" class="flex-table">
						<h5 class="report-item-heading">Dataset</h5>
						<div id="dataset-hbi" class="flex-row">
							<label class="row-label html-link">HBI Dataset</label>
						</div>
					</div>

					<button id="exportButton" class="btn btn-default btn-raised row-button">
						<i class="fa fa-download"></i>
						Export
					</button>

				</div>

				<div class="im-modal">
					<div class="im-modal-content">
						<div class="modal-dialog">
							<div class="modal-content">
								<div class="modal-header">
									<h4>Export the Gene Expression Graph as...
										<a class="close">X</a>
									</h4>
								</div>
								<div class="modal-body">
									<div class="modal-body exporttable-body">
										<form>
											<label>Select image format
												<select id="fileType" class="form-control">
													<option>PNG</option>
													<option>SVG</option>
												</select>
											</label>
										</form>
									</div>
								</div>
								<div class="modal-footer">
									<a class="btn btn-raised btn-primary" onclick="window.GeneExpressionGraph.exportGraph()">Download now!</a>
								</div>
							</div>
						</div>
					</div>
				<div>

			</div>
		</div>
	`;
	
}

export { main };