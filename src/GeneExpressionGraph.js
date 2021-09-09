'use strict';
/**
 * Violin and jitter display based on the code from:
 * https://www.d3-graph-gallery.com/graph/violin_jitter.html
 */
import { saveAs } from 'file-saver';
const d3 = require('d3');

/**
 * @class GeneExpressionGraph
 * @classdesc Used to display a Gene Expression level graph in the report page
 * of genes
 * @author Rodolfo Allendes
 * @version 1.1
 */
export class GeneExpressionGraph{
	/**
	 * Constructor
	 * @param {object} geneObj The object with the data to be displayed
	 * @param {object} navigate Function used to navigate to different TM pages
	 */
	constructor(geneObj, navigate){
		/* finish execution if no data available */
		if( geneObj.probeSets.length === 0 ){
			d3.select('div#geneExpressionGraph')
				.text('No Gene Expression Data to Display');
			return;
		}
		/* width/height of canvas and margins for the graph */
		this._width = 1000;
		this._height = 400;
		this._margin = {top: 40, right: 40, bottom: 40, left: 60};
		this._navigate = navigate;

		/* Different levels of specificity at which we can look gene expression */
		this._levels = {
			0: 'category',
			1: 'organ',
			2: 'name'
		};
		Object.freeze(this._levels);

		/* The display tree contains the information required for the correct display
		of data points along the X axis */
		this._displayTree = this.initDisplayTree(geneObj.probeSets);
		this._xLabels = [...this._displayTree.get('category').keys()];
		this._xLevels =  Array(this._xLabels.length).fill(0);
		this._colors = this.assignColors([...this._displayTree.get('category').keys()]);
		
		/* parse data to local storage */
		let {min, max, points} = this.processData(geneObj.probeSets);
		this._min = min;
		this._max = max;
		this._points = points;
		
		/* Initialize the Axis of the graph */
		this._xAxis = this.initXAxis();
		this._yAxis = this.initYAxis();
		/* Initialize data points position and color */
		this.setPointPositions();
		/* Initialize histogram for violin plots display */
		this._bins = this.initHistogramBins();
		this.initFunctions();

		d3.select('svg#canvas_geneExpression')
			.attr('viewBox', '0 0 '+this._width+' '+this._height);
		d3.select('svg#canvas_geneExpression g#points')
			.attr('transform', 'translate('+this._margin.left+',0)');
		d3.select('svg#canvas_geneExpression g#violins')
			.attr('transform', 'translate('+this._margin.left+',0)');

		this.plotXAxis();
		this.plotYAxis();
		this.plotPoints();
	}

	/**
	 * Assign a color to each category in the dataset. Color is assigned based in
	 * the schemeCategory10 array available from D3
	 * 
	 * @param {Array} labels The list of strings to be assigned colors
	 * @return {Map} A map that contains for each key (label) its assigned color
	 */
	assignColors(labels){
		let colors = new Map();
		labels.forEach((k,i) => colors.set(k, d3.schemeCategory10[i%d3.schemeCategory10.length]));
		return colors;
	}

	/**
	 * Assert if two elements belong to the same branch of the displayTree
	 *
	 * @param {string} src
	 * @param {string} tgt
	 * @param {int} srcLvl
	 * @param {int} tgtLvl
	 * @return {boolean} whether the source element belongs to the same branch in
	 * the display tree as the target element.
	 */
	belongToSameBranch(src, tgt, srcLvl, tgtLvl){
		// fetch extra details about source and target nodes 
		let srcType = this._levels[srcLvl];
		let srcParent = this._displayTree.get(srcType).get(src).parent;
		let tgtType = this._levels[tgtLvl];
		let tgtParent = this._displayTree.get(tgtType).get(tgt).parent;
		/* if both are on the same lvl and share the parent, they are on the same branch */
		if (srcLvl === tgtLvl && srcParent === tgtParent) return true;
		
		/* if source is below target, then they are on the same branch only if target
			and source share a common ancestor */
		if( srcLvl > tgtLvl ) 
			return this.belongToSameBranch(srcParent, tgt, srcLvl-1, tgtLvl);

		/* if source is above target, then they will only be displayed together if
			they are on different branches, thus always false.
			Same applies for all other cases. */
		return false;
	}

	/**
	 * Export the current graph to an image 
	 */
	exportGraph(){
		let self = this;
		let filetype = d3.select('#geneExpressionGraph #fileType').property('value');
		let graph = d3.select('#geneExpressionGraph #canvas_geneExpression');
		if(filetype === 'PNG'){
			graph.attr('xlink', 'http://www.w3.org/1999/xlink');
		}
		else{
			graph.attr('title', 'TargetMine Gene Expression Graph');
			graph.attr('version', 1.0);
			graph.attr('xmlns', 'http://www.w3.org/2000/svg');
		}

		graph.attr('width', this._width);
		graph.attr('height', this._height);
		graph.insert('style', ':first-child')
			.attr('type', 'text/css')
			.html(this.getCSSStyles());

		let serializer = new XMLSerializer();
		let svgString = serializer.serializeToString(graph.node());
		svgString = svgString.replace(/(\w+)?:?xlink=/g, 'xmlns:xlink='); // Fix root xlink without namespace
		svgString = svgString.replace(/NS\d+:href/g, 'xlink:href'); // Safari NS namespace fix
		

		if(filetype === 'PNG'){
			let imgsrc = 'data:image/svg+xml;base64,'+btoa(unescape(encodeURIComponent(svgString))); // Convert SVG string to data URL
			let canvas = d3.create('canvas')
				.attr('width', 2*this._width)
				.attr('height', 2*this._height)
				.style('display', 'none');

			let context = canvas.node().getContext('2d');			 
			let image = new Image();
			
			image.onload = function() {
				context.fillStyle='#FFFFFF';
				context.fillRect(0, 0, 2*self._width, 2*self._height);
				context.drawImage(image, 0, 0, 2*self._width, 2*self._height);
				canvas.node().toBlob(blob => saveAs(blob, 'graph.png'), 'image/png');
			};
			image.src = imgsrc;
		}
		else{
			let blob = new Blob([svgString], {type: 'image/svg+xml'});
			saveAs(blob, 'graph.svg');
		}
	}

	/**
	 * 
	 * @param {*} node The parent node for CSS style rule extraction
	 * @returns the extracted CSS text
	 */
	getCSSStyles(){
		let selectorTextArr = new Set();
		// add to selectors the classes of the root and its children
		d3.select('#geneExpressionGraph #canvas_geneExpression')
			.call((sel) => {
				sel.node().classList.forEach(c => selectorTextArr.add('.bluegenesToolGeneExpressionGraph .'+c));
				sel.selectAll('*')
					.each(function(){
						this.classList.forEach(c => selectorTextArr.add('.bluegenesToolGeneExpressionGraph .'+c));
					});
			});
		
		// extract the CSS rules
		let extractedCSSText = '';
		for(let i=0; i<document.styleSheets.length; ++i){
			let s = document.styleSheets[i];
			try{
				if(!s.cssRules) continue;
			}catch(e){
				if(e.name !== 'SecurityError') throw e;
				continue;
			}
			let cssRules = s.cssRules;
			for(let j=0; j<cssRules.length; ++j){
				if(selectorTextArr.has(cssRules[j].selectorText))
					extractedCSSText += cssRules[j].cssText;
			}
		}
		return extractedCSSText;
	}

	/**
	 * Initialize a tree of the whole structure of the graph.
	 * In order to handle the transitions between different levels within the tree
	 * being displayed, a whole tree is build on load.
	 * 
	 * @param {Array} probeSets Based on an array of probe sets retrieved from TM,
	 * generate a tree structure that links the different labels associated to 
	 * each level of the tree
	 */
	initDisplayTree(probeSets){
		let category = new Map();
		let organ = new Map();
		let name = new Map();
		probeSets.forEach(ps => {
			ps.expressions.forEach(exp => {
				let categoryDisplay = exp.tissue.category.replace(/[-_/]/g,' ').replace(/(?:^|\s)+\S/g, match => match.toUpperCase()).split(' ');
				let categoryId = categoryDisplay[0].toLowerCase();
				let organDisplay = exp.tissue.organ.replace(/[-_/]/g,' ').replace(/(?:^|\s)+\S/g, match => match.toUpperCase()).split(' ');
				let organId = organDisplay[0].toLowerCase();
				let nameDisplay = exp.tissue.name.replace(/[-_/]/g,' ').replace(/(?:^|\s)+\S/g, match => match.toUpperCase()).split(' ');
				let nameId = nameDisplay[0].toLowerCase();
				// if a node at the category level is not yet included, we can add it
				// together with the first of his childrend and grand-children
				if (!category.has(categoryId)){
					category.set(categoryId, { parent: undefined, children: [organId], display: categoryDisplay	});
					organ.set(organId, { parent: categoryId,	children: [nameId], display: organDisplay	});
					name.set(nameId, { parent: organId,	children: undefined, display: nameDisplay	});
				}
				// when only the node at the organ level has not been added, the parent is
				// already part of the tree, so we only need to update its children and
				// include the new member, together with its first child
				else if (!organ.has(organId)) {
					category.get(categoryId).children.push(organId);
					organ.set(organId, { parent: categoryId,	children: [nameId], display: organDisplay	});
					name.set(nameId, { parent: organId, children: undefined, display: nameDisplay });
				}
				// when a node at the name level has not been added to the tree, we
				// only need to update its parent's list of children and add it to the tree
				else if (!name.has(nameId)) {
					organ.get(organId).children.push(nameId);
					name.set(nameId, { parent: organId, children: undefined, display: nameDisplay	});
				}
			});
		});

		return new Map([
			['category', category],
			['organ', organ],
			['name', name]
		]);
	}

	/**
	 * Bin the data points for violin plots
	 * 
	 * @param {int} nBins the number of bins to use
	 */
	initHistogramBins(nBins=10){
		// define the number of bins and the bounds for each one of them 
		let histogram = d3.bin()
			.domain(this._yAxis.scale().domain())
			.thresholds(this._yAxis.scale().ticks(nBins))
			.value(d => d);
		// pre-process data to filter only displayed points 
		let choices = [];
		d3.selectAll('#geneExpressionGraph #dataPoints-div input.row-checkbox')
			.each(function(){
				let cb = d3.select(this);
				if(cb.property('checked'))
					choices.push(cb.property('value'));
			});
		let data = this._points.filter(p => choices.includes(p.call));
		// extract label and values from data only 
		// let filteredData = this._points.map( p => {
		let filteredData = data.map(p => {
			let value = p.value;
			let idx = this._xLabels.indexOf(p.category);
			if (idx !== -1 && this._xLevels[idx] == 0)
				return {label: p.category, value};
			else{
				idx = this._xLabels.indexOf(p.organ);
				if (idx !== -1 && this._xLevels[idx] == 1)
					return {label: p.organ, value};
			}
			return {label: p.name, value};
		},this);
	
		return d3.rollup(
			filteredData, 
			d => {
				let input = d.map(g => g.value);
				let bins = histogram(input);
				return bins;
			},
			d => d.label
		);
	}

	/**
	 * Initialize the X axis of the graph
	 */
	initXAxis(){
		/* The bottom axis will map to a series of discrete pixel values, evenly
		 * distributed along the drawing area, for this, we use the scaleBand scale
		 * provided by D3 */
		let scale = d3.scaleBand()
			.domain(this._xLabels)
			.range( [0, this._width-this._margin.left-this._margin.right] )
			.padding(0.05)
		;
		/* create the corresponding axis */
		return d3.axisBottom(scale);
	}

	/**
	 * Initialize the Y axis of the graph
	 */
	initYAxis(){
		let scale = d3.scaleLinear().domain([0, this._max])
			.range( [this._height-this._margin.bottom, this._margin.top] )
			.nice();
		/* create the corresponding axis */
		return d3.axisLeft(scale);
	}

	/**
 	 * Load data for graph display
	 * Data is provided by TargetMine in the form of an ArrayList. The first
	 * element includes the names for the data columns, with the following n-1
	 * elements of the array each representing a tab separated data point. Since
	 * the ArrayList is converted to its String representation before being
	 * transfered, items in the Array are separated by the character ','
	 *
	 * @param {string} probeSets The Java ArrayList string representation of the data
	 * retrieved from the database for the construction of the graph.
	 */
	processData(probeSets){
		let points = [];
		let min = +Infinity;
		let max = -Infinity;
		
		probeSets.forEach(ps => {
			let exp = ps.expressions.map(e => {
				let category = e.tissue.category.replace(/[-_/]/g,' ').split(' ')[0].toLowerCase();
				let robj = {
					call: e.call,
					value: e.value,
					category, 
					organ: e.tissue.organ.replace(/[-_/]/g,' ').split(' ')[0].toLowerCase(),
					name: e.tissue.name.replace(/[-_/]/g,' ').split(' ')[0].toLowerCase(),
					color: this._colors.get(category),
					pid: ps.probeSetId
				};
				max = e.value > max ? e.value : max;
				min = e.value < min ? e.value : min;
				return 	robj;
			});
			points.push(exp);
		});
		
		points = points.flat();
		return {min, max, points};
	}
	
	/**
	 * Assing functions to check-boxes
	 */
	initFunctions(){
		let self = this;
		d3.select('#geneExpressionGraph #cb-violin')
			.on('change', function(){
				self.plotViolins(this.checked);
			});
		d3.select('#geneExpressionGraph #cb-jitter')
			.on('change', function(){
				self.setPointPositions(this.checked);
				self.plotPoints();
			});
		d3.selectAll('#geneExpressionGraph #dataPoints-div input.row-checkbox')
			.on('change', function(){ 
				self._bins = self.initHistogramBins();
				self.plotViolins(d3.select('#geneExpressionGraph #cb-violin').property('checked'));
				self.plotPoints(); 
			});
		d3.select('#geneExpresssionGraph #dataset-hbi label')
			.on('click', function(){
				self._navigate('report', {
					type: 'DataSet',
					id: 133000002 // only valid for brak
				});
			});
		d3.select('#geneExpressionGraph button#exportButton')
			.on('click', function(){
				d3.select('#geneExpressionGraph div.im-modal')
					.style('display', 'flex');
			});
		d3.select('#geneExpressionGraph div.im-modal a.close')
			.on('click', function(){
				d3.select('#geneExpressionGraph div.im-modal')
					.style('display', 'none');
			});
	}

	/**
	 * Collapse the labels associated to the X axis
	 *
	 * @param {string} target the label of the x Axis tick we are trying to collapse
	 * into is parent category.
	 * @return {boolean} whether the collapsing took place or not
	 */
	collapseXLabels(target){
		let i = this._xLabels.indexOf(target);
		let lvl = this._xLevels[i];

		/* we can only collapse levels that are above the root level */
		if( lvl < 1 ) return false;
		
		let type = this._levels[lvl];
		/* we will reconstruct the label and level arrays, including only the
			elements on different branches of the display tree than the target, and
			the parent element for the target */
		let newLabels = [];
		let newLevels = [];

		this._xLabels.forEach( (item, j) => {
			// if the current element is the target, then we add its parent element
			// to the new labels
			if( item === target ){
				newLabels.push(this._displayTree.get(type).get(item).parent);
				newLevels.push(lvl-1);
			}
			// if the current element is on a different branch of the tree, we simply
			// copy it to the new elements
			else if( !this.belongToSameBranch(item, target, this._xLevels[j], lvl) ){
				newLabels.push(item);
				newLevels.push(this._xLevels[j]);
			}
			/* else, we do nothing, as it means the element is part of the branch
				to be replaced by the parent of the target element */
		},this);

		// Once we have completed the definition of the label and level arrays, we
		// simply copy them and recreate the axis and plot
		this._xLabels = newLabels;
		this._xLevels = newLevels;
		this._xAxis = this.initXAxis();
		this.setPointPositions(d3.select('#geneExpressionGraph #cb-jitter').property('checked'));
		this._bins = this.initHistogramBins();
		this.plotXAxis();
		this.plotPoints();
		this.plotViolins(d3.select('#geneExpressionGraph #cb-violin').property('checked'));
		return true;	
	}

	/**
	 * Expand the labels associated to the X axis
	 *
	 * @param {string} target the label on the X axis that the user clicked, so
	 * to expand into its components
	 * @return a boolean value indicating if the expansion was carried out or not
	 */
	expandXLabels(target){
		let i = this._xLabels.indexOf(target);
		let lvl = this._xLevels[i];
		// exit if the level cannot be expanded
		if (lvl >= 2) return false;

		let type = this._levels[lvl];
		let newLabels = this._displayTree.get(type).get(target).children;
		let newLevels = Array(newLabels.length).fill(lvl+1);

		this._xLabels.splice(i, 1, newLabels);
		this._xLabels = this._xLabels.flat();
		this._xLevels.splice(i, 1, newLevels);
		this._xLevels = this._xLevels.flat();

		/* redefine the x Axis with the new list of labels */
		this._xAxis = this.initXAxis();
		this.setPointPositions(d3.select('#geneExpressionGraph #cb-jitter').property('checked'));
		this._bins = this.initHistogramBins();
		/* re-plot the graph */
		this.plotXAxis();
		this.plotPoints();
		this.plotViolins(d3.select('#geneExpressionGraph #cb-violin').property('checked'));
		return true;
	}

	/**
	 * Display points to represent Gene Expression values
	 */
	plotPoints(){
		let choices = [];
		d3.selectAll('#geneExpressionGraph #dataPoints-div input.row-checkbox')
			.each(function(){
				let cb = d3.select(this);
				if(cb.property('checked'))
					choices.push(cb.property('value'));
			});
		let data = this._points.filter(p => choices.includes(p.call));
		
		d3.select('#geneExpressionGraph g#points').selectAll('circle')
			.data(data)
			.join('circle')
				.attr('cx', d => d.x)
				.attr('cy', d => d.y)
				.attr('r', '3')
				.style('fill', d => d.color)
				.append('svg:title')
					.text( d => {
						return 'Probe Set: '+d.pid+
							'\nCall: '+d.call+
							'\nValue: '+parseFloat(d.value).toFixed(3);
					});
	}

	/**
	 * Add violin plots next to points in the graph
	 * 
	 * @param {boolean} display whether the violins should be displayed or not
	 */
	plotViolins(display=true){
		// remove previous display
		d3.select('#geneExpressionGraph g#violins').selectAll('g').remove();
		
		if (!display)	return;
			
		let X = this._xAxis.scale();
		let Y = this._yAxis.scale();
		
		// Find the largest number of elements contained by a bin 
		let maxNum = 0;
		this._bins.forEach(b => {
			let lengths = b.map(g => g.length); // the # of eles in each bin
			let longest = d3.max(lengths); // the maximum among the previous values
			maxNum = longest > maxNum ? longest : maxNum; // update the global maximum
		});
		let xNum = d3.scaleLinear()
			.range([0, X.bandwidth()])
			.domain([-maxNum, maxNum]);
	
		d3.select('#geneExpressionGraph g#violins').selectAll('g')
			.data(this._bins)
			.join('g') // So now we are working group per group
				.attr('class', 'violin')
				.attr('transform', d => 'translate(' + (X(d[0])+(X.bandwidth()/10)) +' ,0)')
					.append('path')
						.datum(d => d[1]) //extract only the bins
						.attr('class', 'violin')
						.attr('d', d3.area()
							.x0(xNum(0))
							.x1(d => xNum(d.length))
							.y(d => Y(d.x0))
							.curve(d3.curveCatmullRom)    // This makes the line smoother to give the violin appearance. Try d3.curveStep to see the difference
						);
	}

	/** 
	 * Plot the X Axis
	 */
	plotXAxis(){
		// remove previous axis components
		d3.select('#geneExpressionGraph #bottom-axis').remove();

		// add the axis to the display
		d3.select('#geneExpressionGraph g#graph')
			.append('g')
			.attr('id', 'bottom-axis')
			.attr('transform', 'translate('+this._margin.left+', '+(this._height-this._margin.bottom)+')')
			.call(this._xAxis);

		// assign an id to all text used for ticks in the axis 
		d3.selectAll('#geneExpressionGraph g#bottom-axis > g.tick')
			.attr('id', d => d);

		// change the text for the display value associated to it 
		this._xLabels.forEach((item,i) => {
			d3.select('#geneExpressionGraph g.tick#'+item+' text')
				.text('')
				.selectAll('tspan')
					.data(this._displayTree.get(this._levels[this._xLevels[i]]).get(item).display)
					.join('tspan')
						.text(d => d)
						.classed('link',true)
						.attr('dy', '1em')
						.attr('x', '0');
		},this);

		/* assign click function to axis labels if required */
		let self = this;
		d3.selectAll('#geneExpressionGraph g#bottom-axis g.tick')
			.on('click', (ev,d) => self.expandXLabels(d) )
			.on('contextmenu', (ev,d) => {
				ev.preventDefault();
				self.collapseXLabels(d);
			})
			.append('svg:title')
				.text(d => {
					let i = self._xLevels[self._xLabels.indexOf(d)];
					switch(i){
					case 0: 
						return 'Click to expand';
					case 1:
						return 'Click to expand\nRight-click to contract';
					case 2:
						return 'Right-click to contract';
					}
				})
		;
			
	}

	/**
	 * Add DOM elements required for Y-axis display
	 */
	plotYAxis(){
		// remove previous components 
		d3.select('#geneExpressionGraph #left-axis').remove();
		
		// add the axis to the display
		d3.select('#geneExpressionGraph > g#graph')
			.append('g')
			.attr('id', 'left-axis')
			.attr('transform', 'translate('+this._margin.left+',0)')
			.call(this._yAxis);

		/* if defined, add a title to the axis */
		d3.select('#geneExpressionGraph #left-axis-label')
			.attr('y', 0)
			.attr('x', -this._height/2)
			.attr('dy', '1em')
			.style('text-anchor', 'middle');
	}

	/**
	 * Set the position (in viewBox coordinates) of each point in the data
	 *
	 * @param {boolean} jitter Should the position of the point be randomly
	 * jittered along the X axis or not.
	 */
	setPointPositions(jitter=false){
		let X = this._xAxis.scale();
		let dx = X.bandwidth()/2; // for jitter purposes
		let Y = this._yAxis.scale();

		this._xLabels.forEach((label, i) => {
			const lvl = this._levels[this._xLevels[i]];
			this._points.forEach(p => {
				if(p[lvl] === label){
					p.x = X(p[lvl])+dx;
					p.x = jitter ?  p.x-((dx/2)*Math.random()) : p.x;
					p.y = Y(p.value);	
				} 
			});
		},this);
	}
}