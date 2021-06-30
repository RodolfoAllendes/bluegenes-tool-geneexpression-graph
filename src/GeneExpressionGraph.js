'use strict';
/**
 * Violin and jitter display based on the code from:
 * https://www.d3-graph-gallery.com/graph/violin_jitter.html
 */
// import * as d3 from 'd3';
const d3 = require('d3');

/**
 * @class GeneExpressionGraph
 * @classdesc Used to display a Gene Expression level graph in the report page
 * of genes
 * @author Rodolfo Allendes
 * @version 1.0
 */
export class GeneExpressionGraph{
	/**
	 * Constructor
	 * @param {object} geneObj The object with the data to be displayed
	 */
	constructor(geneObj){
		/* finish execution if no data available */
		if( geneObj.probeSets.length === 0 ){
			d3.select('#geneExpressionGraph-div')
				.text('No Gene Expression Data to Display');
			return;
		}
		this._type = 'geneExpressionGraph';
		this._name = geneObj.symbol;
		/* width/height of canvas and margins for the graph */
		this._width = 1000;
		this._height = 400;
		this._margin = {top: 40, right: 40, bottom: 40, left: 60};

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

		d3.select('g#points')
			.attr('transform', 'translate('+this._margin.left+',0)');
		d3.select('g#violins')
			.attr('transform', 'translate('+this._margin.left+',0)');

		this.plotXAxis();
		this.plotYAxis();
		this.plotPoints();
	}

	/**
	 * Assign a color to each category in the datset
	 */
	assignColors(labels){
		let colors = new Map();
		labels.forEach((k,i) => colors.set(k, d3.schemeCategory10[i%d3.schemeCategory10.length]));
		return colors;
	}

	/**
	 * Assert if two elements belong to the same branch of the displayTree
	 *
	 * @param {string} source
	 * @param {string} target
	 * @param {int} sourceLevel
	 * @return {boolean} whether the source element belongs to the same branch in
	 * the display tree as the target element.
	 */
	belongToSameBranch(source, target, sourceLevel, targetLevel){
		/* if both are on the same lvl and share the parent, they are on the same branch */
		if(
			sourceLevel === targetLevel &&
			this._displayTree[sourceLevel][source].parent === this._displayTree[targetLevel][target].parent
		){
			return true;
		}

		/* if source is below target, then they are on the same branch only if target
			and source share a common ancestor */
		if( sourceLevel > targetLevel ){
			return this.belongToSameBranch(this._displayTree[sourceLevel][source].parent, target, sourceLevel-1, targetLevel);
		}

		/* if source is above target, then they will only be displayed together if
			they are on different branches, thus always false.
			Same applies for all other cases. */
		return false;
	}

	/**
	 * Initialize a tree of the whole structure of the graph.
	 * In order to handle the transitions between different levels within the tree
	 * being displayed, a whole tree is build on load.
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
	 */
	initHistogramBins(nBins=10){
		// define the number of bins and the bounds for each one of them 
		let histogram = d3.bin()
			.domain(this._yAxis.scale().domain())
			.thresholds(this._yAxis.scale().ticks(nBins))
			.value(d => d);
		// pre-process the data array to extract the label and values only 
		let filteredData = this._points.map( p => {
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
			filteredData, //self._data,
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
	 * @param {string} data The Java ArrayList string representation of the data
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
		/* Event handlers association */
		d3.select('#cb-violin').on('change', function(){
			if( this.checked )
				self.plotViolins();
			else{
				d3.select('#violins').selectAll('g').remove();
			}
		});
		d3.select('#cb-jitter').on('change', function(){
			self.setPointPositions(this.checked);
			self.plotPoints();
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
		if( lvl >= 1 ){
			/* we will reconstruct the label and level arrays, including only the
			 elements on different branches of the display tree than the target, and
			 the parent element for the target */
			let newLabels = [];
			let newLevels = [];

			this._xLabels.forEach( (item, j) => {
				// if the current element is the target, then we add its parent element
				// to the new labels
				if( item === target ){
					newLabels.push(this._displayTree[lvl][item].parent);
					newLevels.push(lvl-1);
				}
				// if the current element is on a different branch of the tree, we simply
				// copy it to the new elements
				else if( !this.belongToSameBranch(item, target, this._xLevels[j] ,lvl) ){
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
			this.initXAxis();
			this.setPointPositions(d3.select('#cb-jitter').property('checked'));
			this.initHistogramBins();
			this.plotXAxis();
			this.plotPoints();
			return true;
		}
		else{
			return false;
		}
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
		this.setPointPositions(d3.select('#cb-jitter').property('checked'));
		this._bins = this.initHistogramBins();
		/* re-plot the graph */
		this.plotXAxis();
		this.plotPoints();
		return true;
	}

	/**
	 * 
	 */
	plotPoints(){
		d3.select('g#points').selectAll('circle')
			.data(this._points)
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
	 *
	 */
	plotViolins(){
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
	
		d3.select('g#violins').selectAll('g')
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
		d3.select('#bottom-axis').remove();

		// add the axis to the display
		d3.select('svg#canvas_geneExpression > g#graph')
			.append('g')
			.attr('id', 'bottom-axis')
			.attr('transform', 'translate('+this._margin.left+', '+(this._height-this._margin.bottom)+')')
			.call(this._xAxis);

		// assign an id to all text used for ticks in the axis 
		d3.selectAll('g#bottom-axis > g.tick > text')
			.attr('id', function(d){ return d; })
		;

		// change the text for the display value associated to it 
		this._xLabels.forEach((item,i) => {
			d3.select('text#'+item)
				.text('')
				.selectAll('tspan')
					.data(this._displayTree.get(this._levels[this._xLevels[i]]).get(item).display)
						.enter().append('tspan')
							.text(function(d){ return d; })
							.attr('dy', '1em')
							.attr('x', '0')
						.exit().remove();
		},this);

		/* assign click function to axis labels if required */
		let self = this;
		d3.selectAll('g#bottom-axis > g.tick > text')
			/* on left click, expand the current level */
			.on('click', (ev,d) => { self.expandXLabels(d); })
			/* on right click, collapse the current level */
			.on('contextmenu', (ev,d) => {
				ev.preventDefault();
				self.collapseXLabels(d);
			});
	}

	/**
	 * Add DOM elements required for Y-axis display
	 */
	plotYAxis(){
		// remove previous components 
		d3.select('#left-axis').remove();
		
		// add the axis to the display
		d3.select('svg#canvas_geneExpression > g#graph')
			.append('g')
			.attr('id', 'left-axis')
			.attr('transform', 'translate('+this._margin.left+',0)')
			.call(this._yAxis);

		/* if defined, add a title to the axis */
		d3.select('#left-axis-label')
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