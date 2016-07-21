var PIXI            = require("pixi.js");

var idGen = 0;

var IsoView = function(view)
{
	this._view = view;
//    	view.scale.set(0.25);
	// the pixi sprite or object..
    this.view = new PIXI.Container();
    this.inner = new PIXI.Container();
    this.scaleContainer = new PIXI.Container();
     this.inner.addChild(new PIXI.Graphics().beginFill(0xFF0000).drawCircle(0,0,5))

   // this.scaleContainer.scale.set(0.25);

    this.view.addChild(this.inner);
   // this.inner.addChild(view);
    this.inner.addChild(this.scaleContainer);
    this.scaleContainer.addChild(view);
    //view.alpha = 0.9;
    this.position = {x:0, y:0, z:0};
    this.projectFloor = true;
    this.projectWall = false;
    this.rotation = 0;
    this.depth = 0;

    this.dynamic = true;
}

IsoView.prototype.update = function()
{
	// nuting to be done..
	// loop through and collect objects to render!
	// static objects can be easily found?
	/*
	this.camera.update();

    var zoom = this.camera.zoom;

    this.scale.set(zoom);
    this.position.x = this.camera.viewWidth/2 - ( (this.camera.viewWidth/2) * zoom);
    this.position.y = this.camera.viewHeight/2 - ( (this.camera.viewHeight/2) * zoom);

    this.innerContainer.x = -this.camera.x + this.camera.viewWidth/2;
    this.innerContainer.y = -this.camera.y + this.camera.viewHeight/2;

    for (var j in this.layers)
    {
    	var layer = this.layers[j];

    	for (var i = 0; i < layer.children.length; i++)
    	{

    		var iso = layer.children[i];
    		var posX = iso._item.position.x;
    		var posY = iso._item.position.y;
    		iso.position.x = (posX - posY);// * TILE_WIDTH_HALF;
			iso.position.y = (posX + posY) * 0.5;// * TILE_HEIGHT_HALF;

    	};
    };
*/

}

IsoView.from = function(view)
{
	return new IsoView(view);
}

module.exports = IsoView;
