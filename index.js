console.log("START UP")
var PIXI = require('pixi.js');
var iso = require('./iso');

var renderer = new PIXI.WebGLRenderer(window.innerWidth, window.innerHeight);

document.body.appendChild(renderer.view);

var Camera = function(){

	this.x = 400;
	this.y = 400;

	this.viewWidth = window.innerWidth;
	this.viewHeight = window.innerHeight;

	this.zoom = 1;
}

Camera.prototype.update = function(){

}

var camera = new Camera();

var stage = new PIXI.Container();
var world = new iso.IsoWorld({camera:camera, tileSize: 256});

var createFloor = function(){

	for (var i = 0; i < 9; i++) {
		var tile = new iso.IsoObject(new PIXI.Sprite.fromImage('/img/tile_grass.jpg'));
		tile.position.x = (i % 3) * 256;
		tile.position.y = ( (i / 3)|0 ) * 256;
		world.add(tile);
	}
}

var createFence = function(){

	var walls = [];

	for (var i = 0; i < 12; i++) {

		var sprite = new PIXI.Sprite.fromImage('/img/wall_fence.png');
		sprite.anchor.set(0.5, 1);
		sprite.scale.y = 0.2;
		var wall = new iso.IsoObject(sprite);
		wall.projectWall = true;

		world.add(wall);

		walls.push(wall);
	}

	walls[0].position.x = 256+128;
	walls[0].position.y = 256;

	walls[1].position.x = 256;
	walls[1].position.y = 256 + 128;
	walls[1].rotation = Math.PI/2;

	walls[2].position.x = 256 + 128;
	walls[2].position.y = 256 + 256;
	walls[2].rotation = Math.PI;

	walls[3].position.x = 256 + 256;
	walls[3].position.y = 256 + 128;
	walls[3].rotation = (Math.PI/2) * 3;

	walls[4].position.x = 256 + 128;
	walls[4].position.y = 256 + 128;
	walls[4].rotation = Math.PI/2;

	walls[5].position.x = 128;
	walls[5].position.y = 256 + 128;
	walls[5].rotation = 0;

	walls[6].position.x = 512 + 128;
	walls[6].position.y = 256 + 128;
	walls[6].rotation = 0;

	walls[7].position.x = 256 + 64;
	walls[7].position.y = 128;
	walls[7].rotation = Math.PI/2;

	walls[8].position.x = 256 + 192;
	walls[8].position.y = 128;
	walls[8].rotation = Math.PI/2;

	walls[9].position.x = 256 + 64;
	walls[9].position.y = 512 + 128;
	walls[9].rotation = Math.PI/2;

	walls[10].position.x = 256 + 192;
	walls[10].position.y = 512 + 128;
	walls[10].rotation = Math.PI/2;

	//pair to walls[4]
	walls[11].position.x = 256 + 128;
	walls[11].position.y = 256 + 128;
	walls[11].rotation = 0;
}

var createDude = function(){
	var sprite = new PIXI.Sprite.fromImage('/img/character.png');
		sprite.anchor.set(0.5, 1);
		var dude = new iso.IsoObject(sprite);
		dude.projectWall = true;
		dude.projectDude = true;

	world.add(dude);

	dude.position.x = 256;
	dude.position.y = 256;

	return dude;
}

createFloor();
createFence();
var dude = createDude();

stage.interactive = true;
stage.mousemove = function(e){
	dude.position.x = e.data.global.x
	dude.position.y = e.data.global.y
}
stage.addChild(world);


var update = function()
{


    renderer.render(stage);

    window.requestAnimationFrame(update);

}

window.requestAnimationFrame(update);