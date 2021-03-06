var PIXI = require("pixi.js");
var PIXI_DISPLAY = require("pixi-display");
var SpatialHash = require("./SpatialHash");
var ScanlineGroup = require("./ScanlineGroup");


var IsoWorld = function (params) {
    PIXI.Container.call(this);

    this.innerContainer = new PIXI.Container();

    this.displayList = new PIXI.DisplayList();

    this.floorGroup = new PIXI.DisplayGroup(-2, function(elem) {
        elem.zOrder = elem.worldTransform.ty;
    });

    this.wallGroup = new ScanlineGroup(-1, 2);

    this.staticGroup = new SpatialHash();
    this.dynamicGroup = [];

    this.activeItemsContainer = new PIXI.Container();

    this.mouseChildren = false;

    this.addChild(this.innerContainer);
    this.innerContainer.addChild(this.activeItemsContainer);

    this.filterArea = new PIXI.Rectangle(0, 0, 1000000, 1000000);

    this.camera = params.camera || {x: 0, y: 0, zoom: 1};

    /**
     * required for correct sorting
     * @type {number}
     */
    this.tileSize = params.tileSize || 1;

    this.isoChildren = [];

    this.visualChildren = [];
};

IsoWorld.prototype = Object.create(PIXI.Container.prototype);

IsoWorld.prototype.update = function () {
};

IsoWorld.prototype.collectVisibleItems = function () {

};

IsoWorld.prototype.updateTransform = function () {

    //this.activeItemsContainer.children = this.hash.retrieve(new PIXI.Rectangle(200,0, 10, 10));

    /*
     for (var i = 0; i <  this.activeItemsContainer.children.length; i++) {
     this.activeItemsContainer.children[i].parent =  this.activeItemsContainer;
     };
     */
    // loop through - are positions where they need to be?

    //need this temporarily

    var scale = 0.7;
    var cx = (this.camera.x - this.camera.y) * scale;
    var cy = ((this.camera.x + this.camera.y) / 2) * scale;

    var left = cx - this.camera.viewWidth / 2;
    var right = cx + this.camera.viewWidth / 2;

    var top = cy - this.camera.viewHeight / 2;
    var bottom = cy + this.camera.viewHeight / 2;

    var staticItems = this.staticGroup.retrieve(new PIXI.Rectangle(left, top, this.camera.viewWidth, this.camera.viewHeight));
    var visualChildren = staticItems;//this.dynamicGroup);

    // this.dynamicGroup.sort(sortyx);

    var i, count = 0;

    for (i = 0; i < this.dynamicGroup.length; i++) {
        var item = this.dynamicGroup[i];
        var pos = (item.position.x - item.position.y) * 0.70;

        if (pos < left) {
            continue
        }
        else if (pos > right) {
            break
        }
        else {
            var posY = ((item.position.x + item.position.y) / 2) * scale;

            if (posY > top && posY < bottom) {
                count++;
                visualChildren.push(item);
            }
        }
    }

    var children = [];
    // merge items...

    for (i = 0; i < visualChildren.length; i++) {

        children[i] = visualChildren[i].view;
    }

    this.activeItemsContainer.children = children;

    for (i = 0; i < visualChildren.length; i++) {

        this.updateItem(visualChildren[i]);
        children[i] = visualChildren[i].view;

    }

    this.camera.update();

    var zoom = 1 * (1 / 0.7) * this.camera.zoom;

    this.scale.set(zoom);
    this.position.x = this.camera.viewWidth / 2 - ( (this.camera.viewWidth / 2) * zoom);
    this.position.y = this.camera.viewHeight / 2 - ( (this.camera.viewHeight / 2) * zoom);


    this.innerContainer.x = -cx + this.camera.viewWidth / 2;
    this.innerContainer.y = -cy + this.camera.viewHeight / 2;


    this.containerUpdateTransform();

    if (this.displayList) {
        this.displayList.update(this);
    }
};

IsoWorld.prototype.add = function (iso) {

};

var sorty = function (a, b) {

    /// SORTING FUNCTION HELP???

    return ( a.sortY + a.depth) - ( b.sortY + b.depth );
};

var sortyx = function (a, b) {

    return a.position.x - b.position.x;
};

IsoWorld.prototype.clear = function () {
    for (var i = 0; i < this.isoChildren.length; i++) {

        var iso = this.isoChildren[i];
        //this.activeItemsContainer.removeChild(iso.view);
    }

    this.staticGroup.clear();
    this.dynamicGroup.length = 0;
    this.isoChildren.length = 0;
};

IsoWorld.prototype.add = function (iso) {
    if (!iso.dynamic) {
        this.updateItem(iso);
        this.staticGroup.add(iso);
    }
    else {
        this.dynamicGroup.push(iso);
    }

//    this.hash.add(iso.view);
    iso.view.parent = this.activeItemsContainer;
    this.isoChildren.push(iso);
    //this.activeItemsContainer.addChild(iso.view);
};

IsoWorld.prototype.updateItem = function (iso) {
    var item = iso;

    //Cartesian to isometric:
    var scale = 0.70;

    var u = item.position.x, v = item.position.y;

    item.view.position.x = (u - v) * scale;
    item.view.position.y = ((u + v) / 2) * scale;

    item.view.position.y += item.position.z;

    var spr = item.view.children[0];
    spr = spr && spr.children[1];
    spr = spr && spr.children[0];

    if (item.projectWall) {
        spr.displayGroup = this.wallGroup;
    } else {
        spr.displayGroup = this.floorGroup;
    }

    item._depth = (item.view.position.x + item.view.position.y) + item.depth;

    var DEGS_TO_RAD = Math.PI / 180;

    if (item.projectWall) {
        item.view.skew.y = 45 * DEGS_TO_RAD + item.rotation;

//                item.view.skew.x += 0.01;
        item.view.scale.y = 0.5;
        item.inner.scale.y = 2;
        //item.view.inner.anchor.set(0, 1);
    }
    else if (item.projectFloor) {

        item.inner.rotation = 45 * DEGS_TO_RAD + item.rotation;
        item.view.scale.y = 0.5;
    }


};

IsoWorld.prototype.remove = function (iso) {
    // this.hash.remove(iso.view);
    var index = this.isoChildren.indexOf(iso);
    if (index !== -1) {
        this.isoChildren.splice(index, 1);
    }

    if (iso.dynamic) {
        var index = this.dynamicGroup.indexOf(iso);

        if (index !== -1) {
            this.dynamicGroup.splice(index, 1);
        }
    }

    //  this.activeItemsContainer.removeChild(iso.view);
};

module.exports = IsoWorld;
