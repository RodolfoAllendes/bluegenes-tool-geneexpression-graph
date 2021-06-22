var bluegenesToolGeneExpressionGraph=function(t){var e={};function s(i){if(e[i])return e[i].exports;var a=e[i]={i:i,l:!1,exports:{}};return t[i].call(a.exports,a,a.exports,s),a.l=!0,a.exports}return s.m=t,s.c=e,s.d=function(t,e,i){s.o(t,e)||Object.defineProperty(t,e,{enumerable:!0,get:i})},s.r=function(t){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(t,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(t,"__esModule",{value:!0})},s.t=function(t,e){if(1&e&&(t=s(t)),8&e)return t;if(4&e&&"object"==typeof t&&t&&t.__esModule)return t;var i=Object.create(null);if(s.r(i),Object.defineProperty(i,"default",{enumerable:!0,value:t}),2&e&&"string"!=typeof t)for(var a in t)s.d(i,a,function(e){return t[e]}.bind(null,a));return i},s.n=function(t){var e=t&&t.__esModule?function(){return t.default}:function(){return t};return s.d(e,"a",e),e},s.o=function(t,e){return Object.prototype.hasOwnProperty.call(t,e)},s.p="",s(s.s=0)}([function(t,e,s){"use strict";s.r(e),s.d(e,"main",(function(){return a}));class i extends class{constructor(t){this._type=t,this._name=void 0,this._containerId=void 0,this._width=void 0,this._height=void 0,this._margin={top:40,right:40,bottom:40,left:40},this._data=void 0,this._bins=void 0,this._xAxis=void 0,this._yAxis=void 0,this._x=void 0,this._y=void 0,this._xLabels=void 0,this._yLabels=void 0,this._colors=void 0,this._shapes=void 0}setName(t){this._name=t}setContainerId(t){this._containerId=t}setWidth(t){this._width=t}setHeight(t){this._height=t}loadData(t){t=(t=t.substring(1,t.length-1)).replace(/, /g,"\n"),this._data=d3.tsvParse(t,d3.autoType)}async addToDOM(t,e){let s=this;d3.select("#"+t).selectAll().data(e).enter().each((function(t){let e=void 0!==t.position?d3.select(this).insert(t.type,t.position):d3.select(this).insert(t.type);if(void 0!==t.id&&e.attr("id",t.id),void 0!==t.attributes)for(const[s,i]of t.attributes.entries())"text"===s?e.text(i):e.attr(s,i);if(void 0!==t.style)for(const[s,i]of t.style.entries())e.style(s,i);if(void 0!==t.on)for(const[s,i]of t.on.entries())e.on(s,i);void 0!==t.children&&s.addToDOM(t.id,t.children)})).exit().remove()}initXLabels(t=this._x){this._xLabels=[],this._data.forEach((e,s)=>{this._xLabels.includes(e[t])||this._xLabels.push(e[t])},this)}initXAxis(){let t=d3.scaleBand().domain(this._xLabels).range([0,this._width-this._margin.left-this._margin.right]).padding(.05);this._xAxis=d3.axisBottom(t)}initYAxis(t=!1){let e=1/0,s=-1/0;this._data.forEach(t=>{s=Math.max(+t[this._y],s),e=Math.min(+t[this._y],e)},this);let i=1==t?d3.scaleLog().domain([e,s]):d3.scaleLinear().domain([0,s]);i.range([this._height-this._margin.bottom,this._margin.top]),i.nice(),this._yAxis=d3.axisLeft(i),this._yAxis.ticks(10,"~g")}initColorsAndShapes(t=!0){this._colors={Default:"#C0C0C0"},this._shapes={Default:"Circle"},1==t&&this._xLabels.map((t,e)=>{this._colors[t]=d3.schemeCategory10[e%d3.schemeCategory10.length]})}initHistogramBins(t=10){let e=d3.bin().domain(this._yAxis.scale().domain()).thresholds(this._yAxis.scale().ticks(t)).value(t=>t);this._bins=d3.rollup(this._data,t=>{let s=t.map(t=>t["Activity Concentration"]);return e(s)},t=>t["Activity Type"])}assignColors(){let t=Object.keys(this._colors);this._data.forEach((e,s)=>{for(let s=t.length-1;s>0;--s)if(Object.values(e).includes(t[s]))return void(e.color=this._colors[t[s]]);e.color=this._colors.Default},this)}assignShapes(){let t=Object.keys(this._shapes);this._data.forEach((e,s)=>{for(let s=t.length-1;s>0;--s)if(Object.values(e).includes(t[s]))return void(e.shape=this._shapes[t[s]]);e.shape=this._shapes.Default},this)}initTableRows(t,e,s,i){d3.select(t+" > tbody").selectAll("div").remove(),d3.select(t+" > tbody").selectAll("div").data(s).enter().append("div").attr("class","flex-row").attr("id",t=>e+"-"+t).each((function(t,e){i.forEach(t=>{let e=d3.select(this).append(t.type);t.attr.forEach(t=>{e.attr(t[0],t[1])})})}))}setPointPositions(t=!1){let e=this._xAxis.scale(),s=e.bandwidth()/2,i=this._yAxis.scale();this._data.forEach(a=>{a.x=e(a[this._x])+s,t&&(s-=s/2*Math.random()),a.y=i(a[this._y])},this)}plotViolins(){let t=d3.select("svg#canvas_"+this._type+" > g#graph"),e=this._xAxis.scale(),s=this._yAxis.scale();t.selectAll("#violins").remove();let i=0;this._bins.forEach(t=>{let e=t.map(t=>t.length),s=d3.max(e);i=s>i?s:i});let a=d3.scaleLinear().range([0,e.bandwidth()]).domain([-i,i]);t.append("g").attr("id","violins").attr("transform","translate("+this._margin.left+", 0)");d3.select("#violins").selectAll("g").data(this._bins).enter().append("g").attr("class","violin").attr("transform",t=>"translate("+(e(t[0])+e.bandwidth()/10)+" ,0)").append("path").datum(t=>t[1]).attr("class","violin").attr("d",d3.area().x0(a(0)).x1((function(t){return a(t.length)})).y((function(t){return s(t.x0)})).curve(d3.curveCatmullRom))}plotXAxis(t=0,e=!1){let s=d3.select("svg#canvas_"+this._type+" > g#graph");s.selectAll("#bottom-axis").remove();let i=s.append("g").attr("id","bottom-axis").attr("transform","translate("+this._margin.left+", "+(this._height-this._margin.bottom)+")").call(this._xAxis);if(0!=t){i.selectAll("text").attr("y",0).attr("x",9).attr("dy",".35em").attr("transform","rotate("+t+")").style("text-anchor","start")}if(e){d3.selectAll("svg#canvas_"+this._type+" > text#bottom-axis-label").remove();s.append("text").attr("id","bottom-axis-label").attr("transform","translate("+this._width/2+","+(this._height-this._margin.bottom/3)+")").style("text-anchor","middle").text(this._x)}}plotYAxis(){let t=d3.select("svg#canvas_"+this._type+" > g#graph");if(t.selectAll("#left-axis").remove(),t.append("g").attr("id","left-axis").attr("transform","translate("+this._margin.left+",0)").call(this._yAxis),void 0!==this._y){t.selectAll("text#left-axis-label").remove();t.append("text").attr("id","left-axis-label").attr("transform","rotate(-90)").attr("y",-this._margin.left/3).attr("x",-this._height/2).attr("dy","1em").style("text-anchor","middle").text(this._y)}}}{constructor(t,e,s,i,a){console.log(t),super("geneExpression"),super.setName(t),super.setContainerId(s),super.setWidth(i),super.setHeight(a),this._x=void 0,this._y="value",this._levels={0:"category",1:"organ",2:"name"},Object.freeze(this._levels),this._displayTree=void 0,this.loadData(e),0!==this._data.length?(this.initDisplayTree(),this.initXLabels(),this.initXAxis(),this.initYAxis(),this.setPointPositions(),this.initColorsAndShapes(),this.assignColors(),this.initHistogramBins(),this.initDOM(),this.updateVisualsTable(),this.plot()):d3.select("#"+this._containerId).text("No Gene Expression Data to Display")}belongToSameBranch(t,e,s,i){return s===i&&this._displayTree[s][t].parent===this._displayTree[i][e].parent||s>i&&this.belongToSameBranch(this._displayTree[s][t].parent,e,s-1,i)}initDisplayTree(){this._displayTree={0:{},1:{},2:{}},this._data.forEach((t,e)=>{let s=t.category,i=t.organ,a=t.name;this._displayTree[0].hasOwnProperty(s)?this._displayTree[1].hasOwnProperty(i)?this._displayTree[2].hasOwnProperty(a)||(this._displayTree[1][i].children.push(a),this._displayTree[2][a]={parent:i,children:void 0,display:a.replace(/[-_\/]/g," ").replace(/(?:^|\s)+\S/g,t=>t.toUpperCase()).split(" ")}):(this._displayTree[0][s].children.push(i),this._displayTree[1][i]={parent:s,children:[a],display:i.replace(/[-_\/]/g," ").replace(/(?:^|\s)+\S/g,t=>t.toUpperCase()).split(" ")},this._displayTree[2][a]={parent:i,children:void 0,display:a.replace(/[-_\/]/g," ").replace(/(?:^|\s)+\S/g,t=>t.toUpperCase()).split(" ")}):(this._displayTree[0][s]={parent:void 0,children:[i],display:s.replace(/[-_\/]/g," ").replace(/(?:^|\s)+\S/g,t=>t.toUpperCase()).split(" ")},this._displayTree[1][i]={parent:s,children:[a],display:i.replace(/[-_\/]/g," ").replace(/(?:^|\s)+\S/g,t=>t.toUpperCase()).split(" ")},this._displayTree[2][a]={parent:i,children:void 0,display:a.replace(/[-_\/]/g," ").replace(/(?:^|\s)+\S/g,t=>t.toUpperCase()).split(" ")})},this)}initDOM(){const t=[{type:"svg",id:"canvas_"+this._type,attributes:new Map([["class","targetmineGraphSVG"],["viewBox",`0 0 ${this._width} ${this._height}`]]),children:[{type:"g",id:"graph"}]},{type:"div",id:"rightColumn_"+this._type,attributes:new Map([["class","rightColumn"]]),children:[{type:"div",id:"visuals-div",children:[{type:"br"},{type:"label",attributes:new Map([["text","Other Visuals"]])},{type:"table",id:"visuals-table",children:[{type:"tbody"}]}]}]}];super.addToDOM(this._containerId,t)}initHistogramBins(t=10){let e=this,s=d3.bin().domain(e._yAxis.scale().domain()).thresholds(e._yAxis.scale().ticks(t)).value(t=>t),i=this._data.map(t=>{let s=e._xLabels.indexOf(t.category);return-1!==s&&0==e._xLevels[s]?{label:t.category,value:t.value}:(s=e._xLabels.indexOf(t.organ),-1!==s&&1==e._xLevels[s]?{label:t.organ,value:t.value}:{label:t.name,value:t.value})});this._bins=d3.rollup(i,t=>{let e=t.map(t=>t.value);return s(e)},t=>t.label)}initXLabels(){this._xLabels=[],this._xLabels.push(Object.keys(this._displayTree[0])),this._xLabels=this._xLabels.flat(),this._xLevels=Array(this._xLabels.length).fill(0)}updateVisualsTable(){let t=this,e=["violin","jitter"];this.initTableRows("#visuals-table","visual",e,[{type:"input",attr:[["type","checkbox"],["class","flex-cell display"]]},{type:"div",attr:[["class","flex-cell label"]]}]),d3.select("#visuals-table").selectAll(".label").data(e).text(t=>"Add "+t),d3.select("#visuals-table").selectAll("input").data(e).attr("id",t=>"cb-"+t),d3.select("#cb-violin").on("change",(function(){this.checked?t.plotViolins():d3.selectAll("#violins").remove()})),d3.select("#cb-jitter").on("change",(function(){t.setPointPositions(this.checked),t.plot()}))}setPointPositions(t=!1){let e=this,s=this._xAxis.scale(),i=s.bandwidth()/2,a=this._yAxis.scale();this._xLabels.forEach((l,r)=>{let n=e._levels[e._xLevels[r]];e._data.forEach(l=>{l[n]===e._xLabels[r]&&(l.x=s(l[n])+i,t&&(l.x-=i/2*Math.random()),l.y=a(l[this._y]))})})}collapseXLabels(t){let e=this._xLabels.indexOf(t),s=this._xLevels[e];if(s>=1){let e=[],i=[];return this._xLabels.forEach((a,l)=>{a===t?(e.push(this._displayTree[s][a].parent),i.push(s-1)):this.belongToSameBranch(a,t,this._xLevels[l],s)||(e.push(a),i.push(this._xLevels[l]))},this),this._xLabels=e,this._xLevels=i,this.initXAxis(),this.setPointPositions(d3.select("#cb-jitter").property("checked")),this.initHistogramBins(),this.plot(),!0}return console.log("Not possible to collapse this level"),!1}expandXLabels(t){let e=this._xLabels.indexOf(t),s=this._xLevels[e];if(s<2){let i=this._displayTree[s][t].children,a=Array(i.length).fill(s+1);return this._xLabels.splice(e,1,i),this._xLabels=this._xLabels.flat(),this._xLevels.splice(e,1,a),this._xLevels=this._xLevels.flat(),this.initXAxis(),this.setPointPositions(d3.select("#cb-jitter").property("checked")),this.initHistogramBins(),this.plot(),!0}return console.log("Not possible to expand this level"),!1}plotXAxis(t){let e=this;super.plotXAxis();let s=d3.selectAll("g#bottom-axis > g.tick > text").attr("id",(function(t){return t}));this._xLabels.forEach((t,e)=>{if(void 0!==t){d3.select("text#"+t).text("").selectAll("tspan").data(this._displayTree[this._xLevels[e]][t].display).enter().append("tspan").text((function(t){return t})).attr("dy","1em").attr("x","0")}},this),s=d3.selectAll("g#bottom-axis > g.tick > text").on("click",(t,s)=>{e.expandXLabels(s)}).on("contextmenu",(t,s)=>{t.preventDefault(),e.collapseXLabels(s)})}plot(){this.plotXAxis(),this.plotYAxis();let t=d3.select("svg#canvas_geneExpression > g#graph");t.selectAll("#points").remove(),t.append("g").attr("id","points").attr("transform","translate("+this._margin.left+",0)");d3.select("#points").selectAll("g").data(this._data).enter().append("circle").attr("cx",t=>t.x).attr("cy",t=>t.y).attr("r","3").style("fill",t=>t.color).append("svg:title").text(t=>"Category: "+t.category+"\nOrgan: "+t.organ+"\nName: "+t.name+"\nValue: "+t.value);d3.select("#cb-violin").property("checked")&&this.plotViolins()}}function a(t,e,s,a,l){if(a||(a={}),!(t&&e&&s&&a&&l))throw new Error("Call main with correct signature");let r=new imjs.Service(e);r.fetchModel().then(t=>{let e=new imjs.Query({model:t});return e.adjustPath("Gene"),e.select(["Gene.primaryIdentifier","Gene.symbol","Gene.probeSets.probeSetId","Gene.probeSets.expressions.tissue.category","Gene.probeSets.expressions.tissue.organ","Gene.probeSets.expressions.tissue.name","Gene.probeSets.expressions.call","Gene.probeSets.expressions.value"]),e.addConstraints([{path:"id",op:"=",value:s.Gene.value},{path:"Gene.probeSets.expressions.tissue",type:"HbiTissue"},{path:"Gene.probeSets.expressions",type:"HbiExpression"}]),r.records(e)}).then(t=>{window.GeneExpressionGraph=new i(t)}),t.innerHTML='\n\t\t<div class="rootContainer">\n\t\t\t<h1>Your Data Viz Here</h1>\n\t\t</div>\n\t'}}]);