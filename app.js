(function(){
	"use strict";

	var Game = (function(){

		var REFRESH_RATE = 1;
		var GRAVITY = -0.5;
		var FRICTION = 0.16;
		var SPEED_MOVE = 0.19;
		var SPEED_JUMP = 3.8;
		var EXIT = false;
		var LIVES = 3;
		var LEVEL = 1;
		var KEYS = [27, 37, 39, 32];

		var Game = function(selector){
			this.canvas = d3.select(selector);
			this.width = this.canvas[0][0].offsetWidth || this.canvas[0][0].parentNode.clientWidth;
			this.height = this.canvas[0][0].offsetHeight || this.canvas[0][0].parentNode.clientHeight;
			this.nodes = this.getInitialNodes('.node');
			this.enemies = [this.createEnemy()];
			this.keys = {};
			this.t = 0;
			this.freq = 3000;
			this.initControls();
		};

		function position(elem){
			var box = elem.getBBox();
			return [box.x, box.y];
		}

		function dimensions(elem){
			var box = elem.getBBox();
			return [box.width, box.height];
		}

		function updateVelocity(elem, acceleration){
			elem.velocity[0] += acceleration[0];
			elem.velocity[1] += acceleration[1];
		}

		function updatePosition(elem, velocity, dt){
			elem.position[0] += elem.velocity[0]*dt;
			elem.position[1] += elem.velocity[1]*dt;
		}

		function tickGravity(selection){
			var g = GRAVITY;
			selection
				.each(function(d){
					updateVelocity(d, [0, g]);
				});
		}

		function tickFriction(selection){
			var friction = FRICTION;
			selection
				.each(function(d){
					var xDelta = -Math.sign(d.velocity[0])*Math.abs(d.velocity[0]*friction);
					updateVelocity(d, [xDelta, 0]);
				});
		}

		function tickPosition(selection, dt){
			selection
				.each(function(d){
					updatePosition(d, d.velocity, dt);
				});
		}

		function tickLeftRightBounce(selection, width){
			selection
				.each(function(d){
					var left = d.velocity[0] > 0 ? 0 : d.dimensions[0];
					if (d.position[0] < left) {
						d.position[0] = left;
						d.velocity[0] = -d.velocity[0];
					}

					var right = width - d.dimensions[0];
					if (d.position[0] > right) {
						d.position[0] = right;
						d.velocity[0] = -d.velocity[0];
					}
				});
		}

		function tickLeftRightStop(selection, width){
			selection
				.each(function(d){
					var left = d.velocity[0] > 0 ? 0 : d.dimensions[0];
					d.position[0] = Math.max(d.position[0], left);

					var right = width - d.dimensions[0];
					d.position[0] = Math.min(d.position[0], right);
				});
		}

		function tickBottomBorder(selection, height){
			selection
				.each(function(d){
					var bottom = -height*0.5 + d.dimensions[1] + d.initial[1];
					if (d.position[1] < bottom) {
						d.position[1] = bottom;
						d.velocity[1] = 0;
					}
				});
		}

		function tickCollision(selection, enemies, callback){
			selection
				.each(function(d){
					var hits = enemies
						.filter(function(e){
							var left = d.velocity[0] >= 0 ? d.position[0] : d.position[0] - d.dimensions[0];
							return e.position[0] - e.size*0.5 <= left + d.dimensions[0]*0.9
								&& e.position[0] - e.size*0.5 >= left;
						})
						.filter(function(e){
							var top = d.position[1] - d.initial[1];
							return e.position[1] + e.size*0.5 >= top - d.dimensions[1]
							  && e.position[1] - e.size*0.5 <= top;
						});

					if (hits.length > 0 && callback){
						callback(hits);
					}
				});
		}

		Game.prototype.getInitialNodes = function(selector){
			return this.canvas.selectAll(selector)
				.map(function(elem){
					return {
						id: elem[0].id,
						velocity: [0, 0],
						position: [0, 0],

						// precomputed for FF
						// initial: position(elem[0]),
						initial: [-10.761391639709473, 29.352317810058594],

						// precomputed for FF
						// dimensions: dimensions(elem[0])
						dimensions: [116.8009033203125, 93.04519653320312],
					}
				});
		}

		Game.prototype.createEnemy = function(){

			var size = Math.max(Math.random()*20, 5);
			var velocity = Math.random();

			return {
				velocity: [-velocity, 0],
				position: [this.width - size, 0],
				initial: [0, 0],
				dimensions: [size, size],
				size: size
			};
		};

		Game.prototype.getYoshi = function(){
			return this.nodes.filter(function(d){
					return d.id == "yoshi";
				})[0];
		};

		Game.prototype.initControls = function(){
			var self = this;
			d3.select("body")
				.on("keydown", function(){
					if (KEYS.indexOf(d3.event.keyCode) !== -1) {
						self.keys[d3.event.keyCode] = true;
						d3.event.preventDefault();
					}
				})
				.on("keyup", function() {
					if (KEYS.indexOf(d3.event.keyCode) !== -1) {
						self.keys[d3.event.keyCode] = false;
						d3.event.preventDefault();
					}
				});
		};

		Game.prototype.readControls = function(){
			var self = this;

			Object.keys(this.keys)
				.filter(function(keyCode){
					return self.keys[keyCode];
				})
				.map(parseInt)
				.forEach(function(keyCode){
					var yoshi = self.getYoshi();
					var speedMove = SPEED_MOVE;
					var speedJump = [yoshi.velocity[0]*speedMove, SPEED_JUMP];

					// EXIT
					if (keyCode === 27) {
						EXIT = true;
						return;
					}
					// RIGHT
					else if (keyCode === 39) {
						updateVelocity(yoshi, [speedMove, 0]);
					}
					// LEFT
					else if (keyCode === 37) {
						updateVelocity(yoshi, [-speedMove, 0]);
					}
					// JUMP
					else if (keyCode === 32) {
						// Don't allow double jumps
						if (yoshi.velocity[1] === 0){
							updateVelocity(yoshi, speedJump);
						}
						self.keys[keyCode] = false;
					}
					else {
						self.keys[keyCode] = false;
					}
				});
			};

		Game.prototype.animateYoshi = function(t){
			var yoshi = this.getYoshi();

			var frequ = Math.pow(yoshi.velocity[0], 3)*0.15;
			var angle = (Math.cos(t*frequ*0.05) - 0.5);
			var amplitude = Math.max(Math.abs(yoshi.velocity[0]), 0.2)*angle*10*Math.PI;

			this.canvas.select('.leg.right')
				.attr('transform', 'rotate(' + (amplitude + 40) + ', 150, 700)');
			this.canvas.select('.leg.left')
				.attr('transform', 'rotate(' + (-amplitude - 60) + ', 250, 650)');

			var shoeRotate = yoshi.velocity[1] !== 0 ? 45 : 0;

			this.canvas.select('.shoe.right')
				.attr('transform', 'rotate(' + shoeRotate + ', 350, 900)');

			this.canvas.select('.shoe.left')
				.attr('transform', 'rotate(' + shoeRotate + ', 350, 900)');

			var bodyTranslateY = yoshi.velocity[1]*10;

			this.canvas.select('.body')
				.attr('transform', 'translate(0, ' + bodyTranslateY + ')');

			this.canvas.select('.head')
				.attr('transform', 'translate(0, ' + bodyTranslateY + ')');
		};

		Game.prototype.tick = function(t){
			var self = this;
			var dt = t - this.t;

			this.readControls();
			this.animateYoshi(t);

			var labelJoin = this.canvas.selectAll(".label")
				.data([this.enemies.length]);

			labelJoin
				.enter()
				.append('text')
				.attr({
					class: 'label',
					x: this.width*0.5,
					y: this.height*0.2
				})

			labelJoin
				.text(LEVEL);

			this.canvas.selectAll(".node")
				.data(this.nodes)
				.call(tickGravity)
				.call(tickFriction)
				.call(tickPosition, dt*REFRESH_RATE)
				.call(tickCollision, this.enemies, function(hits){
					hits.forEach(function(hit){
						var index = self.enemies.indexOf(hit);
						if (index !== -1){
							self.enemies.splice(index, 1);
						}
					});

					LIVES -= 1;

					if (LIVES === 0){
						EXIT = true;
					}
				})
				.call(tickLeftRightStop, this.width)
				.call(tickBottomBorder, this.height);

			var enemiesJoin = this.canvas.selectAll(".enemy")
				.data(this.enemies)

			enemiesJoin
				.enter()
				.append('circle')
				.attr({
					class: 'enemy',
					cx: function(d){ return d.initial[0]; },
					cy: function(d){ return d.initial[1]; },
					r: function(d){ return d.size; },
					fill: 'red'
				})

			enemiesJoin
				.call(tickGravity)
				.call(tickPosition, dt*REFRESH_RATE)
				.call(tickLeftRightBounce, this.width)
				.call(tickBottomBorder, this.height);

			this.canvas.selectAll(".node, .enemy")
				.data([].concat(this.nodes, this.enemies))
				.attr('transform', function(d){
					return "translate(" + d.position[0] + "," + -d.position[1] + ") scale(" + (Math.sign(d.velocity[0])||1) + ",1)";
				});

			enemiesJoin
				.exit()
				.transition()
				.duration(2500)
				.ease('cubicout')
				.attr('transform', 'translate (' + self.width*0.5 + ', 10000) scale(1,1)')
				.each('end', function(d){
					d3.select(this).remove();
				});

			var livesJoin = this.canvas.selectAll(".lives")
				.data(d3.range(LIVES));

			livesJoin
				.enter()
				.append('g')
				.attr({
					class: 'lives'
				})
				.each(function(d){
					var head = self.canvas.select('.head');
					d3.select(this).html(head.html());
				});

			livesJoin
				.attr('transform', function(d){
					return 'translate(' + d*50 + ',15) scale(0.05)';
				});

			livesJoin
				.exit()
				.transition()
				.duration(1000)
				.attr('opacity', 0)
				.each('end', function(d){
					d3.select(this).remove();
				});

			if (t > this.freq){
				this.enemies.push(this.createEnemy());
				this.freq = this.freq + this.freq * Math.random();
				LEVEL += 1;
			}

			this.t = t;
			return EXIT;
		};

		return Game;
	})();

	var game = new Game('#canvas');

	d3.timer(function(t){
		return game.tick(t);
	});

})();