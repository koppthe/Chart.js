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
		barStrokeWidth: 1,

		// Number - Pixel width of the bar
		barWidth: 45,

		// Number - Spacing between each of the Y value sets
		barValueSpacing: 20,

		scaleLineColor: '#999',

		scaleLineWidth: 0.5
	}

	Chart.HorizonRectangle = Chart.Element.extend({
		draw : function(){
			var ctx = this.ctx,
				halfWidth = this.width / 2,
				topX = this.x,
				bottomX = this.x + halfWidth * 2,
				top = this.y,
				halfStroke = this.strokeWidth / 2;

			// Canvas doesn't allow us to stroke inside the width so we can
			// adjust the sizes to fit if we're setting a stroke on the line
			if (this.showStroke){
				topX += halfStroke;
				bottomX -= halfStroke;
				top += halfStroke;
			}

			ctx.beginPath();

			ctx.fillStyle = this.fillColor;
			ctx.strokeStyle = this.strokeColor;
			ctx.lineWidth = this.strokeWidth;

			// It'd be nice to keep this class totally generic to any rectangle
			// and simply specify which border to miss out.
			ctx.moveTo(this.base, topX)
			ctx.lineTo(top, topX);
			ctx.lineTo(top, bottomX);
			ctx.lineTo(this.base, bottomX);
			ctx.fill();
			if (this.showStroke){
				ctx.stroke();
			}
		}
	});

	Chart.LeafBarScale = Chart.Element.extend({
		initialize : function(){
			this.fit();
		},
		calculateSize : function() {
			var barLen = this.yLabels.length
			this.height = barLen * (this.barWidth + this.barSpacing)
			this.scaleLineX = this.width / 2
			this.ctx.canvas.height = this.height
			this.ctx.canvas.width = this.width
			this.ctx.canvas.style.height = this.height + 'px'
			this.ctx.canvas.style.width = this.width + 'px'
			this.ctx.canvas.parentNode.style.height = this.height + 'px'
			this.ctx.canvas.parentNode.style.width = this.width + 'px'
		},
		buildYLabels : function(){
			// console.log(this.yLabels)
			/*this.yLabels = [];

			var stepDecimalPlaces = helpers.getDecimalPlaces(this.stepValue);

			for (var i=0; i<=this.steps; i++){
				this.yLabels.push(template(this.templateString,{value:(this.min + (i * this.stepValue)).toFixed(stepDecimalPlaces)}));
			}
			this.yLabelWidth = (this.display && this.showLabels) ? helpers.longestText(this.ctx,this.font,this.yLabels) + 10 : 0;*/
		},
		// Fitting loop to rotate x Labels and figure out what fits there, and also calculate how many Y steps to use
		fit: function(){
			// First we need the width of the yLabels, assuming the xLabels aren't rotated

			// To do that we need the base line at the top and base of the chart, assuming there is no x label rotation
			this.startPoint = 0
			this.endPoint = this.height

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
			this.calculateYRange(this.width);

			// With these properties set we can now build the array of yLabels
			// and also the width of the largest yLabel
			this.buildYLabels();

			this.calculateSize()

			// this.calculateXLabelRotation();

			/*while((cachedHeight > this.endPoint - this.startPoint)){
				cachedHeight = this.endPoint - this.startPoint;
				cachedYLabelWidth = this.yLabelWidth;

				this.calculateYRange(cachedHeight);
				this.buildYLabels();

				// Only go through the xLabel loop again if the yLabel width has changed
				if (cachedYLabelWidth < this.yLabelWidth){
					this.endPoint = cachedEndPoint;
					this.calculateXLabelRotation();
				}
			}*/

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
			var scalingFactor = this.scaleLineX / (this.max - this.min)
			return scalingFactor * (value - this.min)
		},
		calculateX : function(index){
				// innerWidth = (this.offsetGridLines) ? this.width - offsetLeft - this.padding : this.width - (offsetLeft + halfLabelWidth * 2) - this.padding,
			var	innerWidth = this.height,
				valueWidth = innerWidth / Math.max((this.valuesCount - ((this.offsetGridLines) ? 0 : 1)), 1),
				valueOffset = (valueWidth * index) + this.barSpacing / 2;

			/*if (this.offsetGridLines){
				valueOffset += (valueWidth/2);
			}*/

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

				ctx.lineWidth = this.lineWidth;
				ctx.strokeStyle = this.lineColor;
				ctx.beginPath();
				ctx.moveTo(this.scaleLineX, 0);
				ctx.lineTo(this.scaleLineX, this.height);
				ctx.stroke();
				ctx.closePath();
			}
		}

	});

	Chart.Type.extend({
		name: 'LeafBar',
		defaults: defaultConfig,
		initialize: function(data) {
			// Expose options as a scope variable here so we can access it in the ScaleClass
			var options = this.options

			this.ScaleClass = Chart.LeafBarScale.extend({
				offsetGridLines: true,
				calculateBarX: function(datasetCount, datasetIndex, barIndex) {
					// Reusable method for calculating the yPosition of given bar based on datasetIndex & width of the bar
					var barWidth = this.calculateBarWidth(datasetCount),
						yAbsolute = this.calculateX(barIndex) - (barWidth / 2)

					return yAbsolute + barWidth / 2
				},
				calculateBarWidth: function(count) {
					var baseWidth = (this.height - this.barSpacing*count) / count
					return baseWidth
				}
			})

			this.datasets = []

			// Declare the extension of the default point, to cater for the options passed in to the constructor
			this.BarClass = Chart.HorizonRectangle.extend({
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
					direction: datasetIndex % 2 == 0 ? 'left' : 'right',
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
						highlightStroke: dataset.highlightStroke || dataset.strokeColor,
					}))
				}, this)
			}, this)

			this.buildScale(data.labels)

			this.BarClass.prototype.base = this.scale.endPoint

			this.eachBars(function(bar, index, datasetIndex) {
				helpers.extend(bar, {
					width: this.scale.calculateBarWidth(this.datasets[datasetIndex].bars.length),
					y: this.scale.calculateBarX(this.datasets.length, datasetIndex, index),
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

			// Use to calculate the range of scale
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
				barWidth : this.options.barWidth,
				barSpacing : this.options.barValueSpacing,
				calculateYRange: function(currentWidth) {
					var updatedRanges = helpers.calculateScaleRange(dataTotal(), currentWidth, this.fontSize, this.beginAtZero, this.integersOnly)
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

			this.scale = new this.ScaleClass(scaleOptions)
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
				helpers.each(dataset.bars, function(bar, index) {
					if (bar.hasValue()) {
						bar.base = this.scale.scaleLineX
						bar.transition({
							x: this.scale.calculateBarX(this.datasets.length, datasetIndex, index),
							y: this.scale.scaleLineX + this.scale.calculateY(bar.value) * (dataset.direction == 'left' ? -1 : 1),
							width: this.scale.calculateBarWidth(this.datasets[datasetIndex].bars.length),
						}, easingDecimal).draw()

						// Draw the value of bars
						if (true) {
							var x = this.scale.scaleLineX + 15 * (dataset.direction == 'left' ? -1 : 1)
							var y = this.scale.calculateBarX(this.datasets.length, datasetIndex, index) + bar.width / 2
							ctx.font = helpers.fontString(this.fontSize, "lighter", "'Helvetica Neue', 'Helvetica', 'Arial', sans-serif");
							ctx.fillStyle = (dataset.direction == 'left' ? '#336666' : '#eee');
							ctx.textAlign = "center";
							ctx.textBaseline = "middle";
							ctx.fillText(bar.value, x, y);
						}
					}
				}, this)
			}, this)
		}
	})

}).call(this);
