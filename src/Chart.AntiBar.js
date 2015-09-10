(function(){
	"use strict"

	var root = this,
		Chart = root.Chart,
		helpers = Chart.helpers

	var defaultConfig = {
		// Boolean - Whether the scale should start at zero, or an order of magnitude down from the lowest value
		scaleBeginAtZero: true,

		// Boolean - If there is a stroke on each bar
		barShowStroke: true,

		// Number - Pixel width of the bar stroke
		barStrokeWidth: 2,

		// Number - Spacing between each of the Y value sets
		barValueSpacing: 5
	}

	Chart.AntiBarScale = Chart.Element.extend({
		initialize : function(){
			this.fit();
		},
		buildYLabels : function(){
			this.yLabels = [];

			var stepDecimalPlaces = helpers.getDecimalPlaces(this.stepValue);

			for (var i=0; i<=this.steps; i++){
				this.yLabels.push(template(this.templateString,{value:(this.min + (i * this.stepValue)).toFixed(stepDecimalPlaces)}));
			}
			this.yLabelWidth = (this.display && this.showLabels) ? helpers.longestText(this.ctx,this.font,this.yLabels) + 10 : 0;
		},
		addXLabel : function(label){
			this.xLabels.push(label);
			this.valuesCount++;
			this.fit();
		},
		removeXLabel : function(){
			this.xLabels.shift();
			this.valuesCount--;
			this.fit();
		},
		// Fitting loop to rotate x Labels and figure out what fits there, and also calculate how many Y steps to use
		fit: function(){
			// First we need the width of the yLabels, assuming the xLabels aren't rotated

			// To do that we need the base line at the top and base of the chart, assuming there is no x label rotation
			this.startPoint = (this.display) ? this.fontSize : 0;
			this.endPoint = (this.display) ? this.height - (this.fontSize * 1.5) - 5 : this.height; // -5 to pad labels

			// Apply padding settings to the start and end point.
			this.startPoint += this.padding;
			this.endPoint -= this.padding;

			// Cache the starting endpoint, excluding the space for x labels
			var cachedEndPoint = this.endPoint;

			// Cache the starting height, so can determine if we need to recalculate the scale yAxis
			var cachedHeight = this.endPoint - this.startPoint,
				cachedYLabelWidth;

			// Build the current yLabels so we have an idea of what size they'll be to start
			/*
			 *	This sets what is returned from calculateScaleRange as static properties of this class:
			 *
				this.steps;
				this.stepValue;
				this.min;
				this.max;
			 *
			 */
			this.calculateYRange(cachedHeight);

			// With these properties set we can now build the array of yLabels
			// and also the width of the largest yLabel
			this.buildYLabels();

			this.calculateXLabelRotation();

			while((cachedHeight > this.endPoint - this.startPoint)){
				cachedHeight = this.endPoint - this.startPoint;
				cachedYLabelWidth = this.yLabelWidth;

				this.calculateYRange(cachedHeight);
				this.buildYLabels();

				// Only go through the xLabel loop again if the yLabel width has changed
				if (cachedYLabelWidth < this.yLabelWidth){
					this.endPoint = cachedEndPoint;
					this.calculateXLabelRotation();
				}
			}

		},
		calculateXLabelRotation : function(){
			//Get the width of each grid by calculating the difference
			//between x offsets between 0 and 1.

			this.ctx.font = this.font;

			var firstWidth = this.ctx.measureText(this.xLabels[0]).width,
				lastWidth = this.ctx.measureText(this.xLabels[this.xLabels.length - 1]).width,
				firstRotated,
				lastRotated;


			this.xScalePaddingRight = lastWidth/2 + 3;
			this.xScalePaddingLeft = (firstWidth/2 > this.yLabelWidth) ? firstWidth/2 : this.yLabelWidth;

			this.xLabelRotation = 0;
			if (this.display){
				var originalLabelWidth = longestText(this.ctx,this.font,this.xLabels),
					cosRotation,
					firstRotatedWidth;
				this.xLabelWidth = originalLabelWidth;
				//Allow 3 pixels x2 padding either side for label readability
				var xGridWidth = Math.floor(this.calculateX(1) - this.calculateX(0)) - 6;

				//Max label rotate should be 90 - also act as a loop counter
				while ((this.xLabelWidth > xGridWidth && this.xLabelRotation === 0) || (this.xLabelWidth > xGridWidth && this.xLabelRotation <= 90 && this.xLabelRotation > 0)){
					cosRotation = Math.cos(toRadians(this.xLabelRotation));

					firstRotated = cosRotation * firstWidth;
					lastRotated = cosRotation * lastWidth;

					// We're right aligning the text now.
					if (firstRotated + this.fontSize / 2 > this.yLabelWidth){
						this.xScalePaddingLeft = firstRotated + this.fontSize / 2;
					}
					this.xScalePaddingRight = this.fontSize/2;


					this.xLabelRotation++;
					this.xLabelWidth = cosRotation * originalLabelWidth;

				}
				if (this.xLabelRotation > 0){
					this.endPoint -= Math.sin(toRadians(this.xLabelRotation))*originalLabelWidth + 3;
				}
			}
			else{
				this.xLabelWidth = 0;
				this.xScalePaddingRight = this.padding;
				this.xScalePaddingLeft = this.padding;
			}

		},
		// Needs to be overidden in each Chart type
		// Otherwise we need to pass all the data into the scale class
		calculateYRange: function() {},
		drawingArea: function(){
			return this.startPoint - this.endPoint;
		},
		calculateY : function(value){
			var scalingFactor = this.drawingArea() / (this.min - this.max);
			return this.endPoint - (scalingFactor * (value - this.min));
		},
		calculateX : function(index){
			var isRotated = (this.xLabelRotation > 0),
				// innerWidth = (this.offsetGridLines) ? this.width - offsetLeft - this.padding : this.width - (offsetLeft + halfLabelWidth * 2) - this.padding,
				innerWidth = this.width - (this.xScalePaddingLeft + this.xScalePaddingRight),
				valueWidth = innerWidth/Math.max((this.valuesCount - ((this.offsetGridLines) ? 0 : 1)), 1),
				valueOffset = (valueWidth * index) + this.xScalePaddingLeft;

			if (this.offsetGridLines){
				valueOffset += (valueWidth/2);
			}

			return Math.round(valueOffset);
		},
		update : function(newProps){
			helpers.extend(this, newProps);
			this.fit();
		},
		draw : function(){
			var ctx = this.ctx,
				yLabelGap = (this.endPoint - this.startPoint) / this.steps,
				xStart = Math.round(this.xScalePaddingLeft);
			if (this.display){
				ctx.fillStyle = this.textColor;
				ctx.font = this.font;
				each(this.yLabels,function(labelString,index){
					var yLabelCenter = this.endPoint - (yLabelGap * index),
						linePositionY = Math.round(yLabelCenter),
						drawHorizontalLine = this.showHorizontalLines;

					ctx.textAlign = "right";
					ctx.textBaseline = "middle";
					if (this.showLabels){
						ctx.fillText(labelString,xStart - 10,yLabelCenter);
					}

					// This is X axis, so draw it
					if (index === 0 && !drawHorizontalLine){
						drawHorizontalLine = true;
					}

					if (drawHorizontalLine){
						ctx.beginPath();
					}

					if (index > 0){
						// This is a grid line in the centre, so drop that
						ctx.lineWidth = this.gridLineWidth;
						ctx.strokeStyle = this.gridLineColor;
					} else {
						// This is the first line on the scale
						ctx.lineWidth = this.lineWidth;
						ctx.strokeStyle = this.lineColor;
					}

					linePositionY += helpers.aliasPixel(ctx.lineWidth);

					if(drawHorizontalLine){
						ctx.moveTo(xStart, linePositionY);
						ctx.lineTo(this.width, linePositionY);
						ctx.stroke();
						ctx.closePath();
					}

					ctx.lineWidth = this.lineWidth;
					ctx.strokeStyle = this.lineColor;
					ctx.beginPath();
					ctx.moveTo(xStart - 5, linePositionY);
					ctx.lineTo(xStart, linePositionY);
					ctx.stroke();
					ctx.closePath();

				},this);

				each(this.xLabels,function(label,index){
					var xPos = this.calculateX(index) + aliasPixel(this.lineWidth),
						// Check to see if line/bar here and decide where to place the line
						linePos = this.calculateX(index - (this.offsetGridLines ? 0.5 : 0)) + aliasPixel(this.lineWidth),
						isRotated = (this.xLabelRotation > 0),
						drawVerticalLine = this.showVerticalLines;

					// This is Y axis, so draw it
					if (index === 0 && !drawVerticalLine){
						drawVerticalLine = true;
					}

					if (drawVerticalLine){
						ctx.beginPath();
					}

					if (index > 0){
						// This is a grid line in the centre, so drop that
						ctx.lineWidth = this.gridLineWidth;
						ctx.strokeStyle = this.gridLineColor;
					} else {
						// This is the first line on the scale
						ctx.lineWidth = this.lineWidth;
						ctx.strokeStyle = this.lineColor;
					}

					if (drawVerticalLine){
						ctx.moveTo(linePos,this.endPoint);
						ctx.lineTo(linePos,this.startPoint - 3);
						ctx.stroke();
						ctx.closePath();
					}


					ctx.lineWidth = this.lineWidth;
					ctx.strokeStyle = this.lineColor;


					// Small lines at the bottom of the base grid line
					ctx.beginPath();
					ctx.moveTo(linePos,this.endPoint);
					ctx.lineTo(linePos,this.endPoint + 5);
					ctx.stroke();
					ctx.closePath();

					ctx.save();
					ctx.translate(xPos,(isRotated) ? this.endPoint + 12 : this.endPoint + 8);
					ctx.rotate(toRadians(this.xLabelRotation)*-1);
					ctx.font = this.font;
					ctx.textAlign = (isRotated) ? "right" : "center";
					ctx.textBaseline = (isRotated) ? "middle" : "top";
					ctx.fillText(label, 0, 0);
					ctx.restore();
				},this);

			}
		}

	});

	Chart.Type.extend({
		name: 'AntiBar',
		defaults: defaultConfig,
		initialize: function(data) {
			// Expose options as a scope variable here so we can access it in the ScaleClass
			var options = this.options

			this.ScaleClass = Chart.AntiBarScale.extend({
				offsetGridLines: true,
				calculateBarY: function(datasetCount, datasetIndex, barIndex) {
					// Reusable method for calculating the yPosition of given bar based on datasetIndex & width of the bar
					var barWidth = this.calculateBarWidth(),
						yAbsolute = this.calculateY(barIndex) - (barWidth / 2)

					return yAbsolute + (barWidth * datasetIndex) + barWidth / 2
				},
				calculateBarWidth: function() {
					return (this.calculateY(1) - this.calculateY(0)) - (2 * options.barValueSpacing)
				}
			})

			this.datasets = []

			// Declare the extension of the default point, to cater for the options passed in to the constructor
			this.BarClass = Chart.Rectangle.extend({
				strokeWidth: this.options.barStrokeWidth,
				showStroke: this.options.barShowStroke,
				ctx: this.chart.ctx
			})

			// Iterate through each of the datasets, and build this into a property of the chart
			helpers.each(data.datasets, function(dataset, datasetIndex) {
				var datasetObject = {
					label: dataset.label || null,
					fillColor: dataset.fillColor,
					strokeColor: dataset.strokeColor,
					bars: []
				}

				this.datasets.push(datasetObject)

				helpers.each(dataset.data, function(dataPoint, index) {
					// Add a new point for each piece of data, passing any required data to draw
					datasetObject.bars.push(new this.BarClass({
						value: dataPoint,
						label: data.labels[index],
						datasetLabel: dataset.label,
						strokeColor: dataset.strokeColor,
						fillColor: dataset.fillColor,
						highlightFill: dataset.highlightFill || dataset.fillColor,
						highlightStroke: dataset.highlightStroke || dataset.strokeColor
					}))
				}, this)
			}, this)

			this.buildScale(data.labels)

			this.BarClass.prototype.base = this.scale.endPoint

			this.eachBars(function(bar, index, datasetIndex) {
				helpers.extend(bar, {
					width: this.scale.calculateBarWidth(),
					y: this.scale.calculateBarY(this.datasets.length, datasetIndex, index),
					x: this.scale.endPoint
				})
				bar.save()
			}, this)

			this.render()
		},
		update: function() {
			this.scale.update()
			// Reset any highlight colors before updating
			helpers.each(this.activeElements, function(activeElements) {
				activeElements.restore(['fillColor', 'strokeColor'])
			})

			this.eachBars(function(bar) {
				bar.save()
			})

			this.render()
		},
		eachBars: function(callback) {
			helpers.each(this.datasets, function(dataset, datasetIndex) {
				helpers.each(dataset.bars, callback, this, datasetIndex)
			}, this)
		},
		buildScale: function(labels) {
			var self = this

			var dataTotal = function() {
				var values = []
				self.eachBars(function(bar) {
					values.push(bar.value)
				})
				return values
			}

			var scaleOptions = {
				height: this.chart.height,
				width: this.chart.width,
				ctx: this.chart.ctx,
				textColor: this.options.scaleFontColor,
				fontSize: this.options.scaleFontSize,
				fontStyle : this.options.scaleFontStyle,
				fontFamily : this.options.scaleFontFamily,
				valuesCount : labels.length,
				beginAtZero : this.options.scaleBeginAtZero,
				integersOnly : this.options.scaleIntegersOnly,
				calculateXRange: function(currentHeight) {
					var updatedRanges = helpers.calculateScaleRange(dataTotal(), currentHeight, this.fontSize, this.beginAtZero, this.integersOnly)
					helpers.extend(this, updatedRanges)
				},
				yLabels: labels,
				font : helpers.fontString(this.options.scaleFontSize, this.options.scaleFontStyle, this.options.scaleFontFamily),
				lineWidth : this.options.scaleLineWidth,
				lineColor : this.options.scaleLineColor,
				padding : (this.options.showScale) ? 0 : (this.options.barShowStroke) ? this.options.barStrokeWidth : 0,
				showLabels : this.options.scaleShowLabels,
				display : this.options.showScale
			}

			if (this.options.scaleOverride){
				helpers.extend(scaleOptions, {
					calculateXRange: helpers.noop,
					steps: this.options.scaleSteps,
					stepValue: this.options.scaleStepWidth,
					min: this.options.scaleStartValue,
					max: this.options.scaleStartValue + (this.options.scaleSteps * this.options.scaleStepWidth)
				});
			}

			this.scale = new this.ScaleClass(scaleOptions)
		},
		addData: function(valuesArray, label) {
			// Map the valuse array for each of the datasets
			helpers.each(valuesArray, function(value, datasetIndex) {
				this.datasets[datasetIndex].bars.push(new this.BarClass({
					value: value,
					label: label,
					datasetLabel: this.datasets[datasetIndex].label,
					y: this.scale.calculateBarY(this.datasets.length, datasetIndex, this.scale.valuesCount + 1),
					x: this.scale.endPoint,
					width: this.scale.calculateBarWidth(this.datasets.length),
					base: this.scale.endPoint,
					strokeColor : this.datasets[datasetIndex].strokeColor,
					fillColor : this.datasets[datasetIndex].fillColor
				}))
			}, this)

			this.scale.addXLabel(label)

			this.update()
		},
		removeData: function() {
			helpers.each(this.datasets, function(dataset) {
				dataset.bars.shift()
			}, this)
			this.update()
		},
		reflow: function() {
			helpers.extend(this.BarClass.prototype, {
				x: this.scale.endPoint,
				base: this.scale.endPoint
			})
			var newScaleProps = helpers.extend({
				height: this.chart.height,
				width: this.chart.width
			})
			this.scale.update(newScaleProps)
		},
		draw: function(ease) {
			var easingDecimal = ease || 1
			this.clear()

			var ctx = this.chart.ctx

			this.scale.draw(easingDecimal)

			// Draw all the bars for each dataset
			helpers.each(this.datasets, function(dataset, datasetIndex) {
				helpers.each(datasets.bars, function(bar, index) {
					if (bar.hasValue()) {
						bar.base = this.scale.endPoint

						bar.transition({
							x: this.scale.calculateX(bar.value),
							y: this.scale.calculateBarY(this.datasets.length, datasetIndex, index),
							width: this.scale.calculateBarWidth(this.datasets.length)
						}, easingDecimal).draw()
					}
				})
			}, this)
		}
	})

}).call(this);
