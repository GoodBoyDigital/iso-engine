/**
 * Created by ivanp on 22.07.2016.
 */

var Scanline = require('./Scanline');

function ScanlineGroup(zIndex) {
    PIXI.DisplayGroup.call(this, zIndex);
    this.scanline = new Scanline();
}

ScanlineGroup.prototype = Object.create(PIXI.DisplayGroup.prototype);
ScanlineGroup.prototype.constructor = ScanlineGroup;

ScanlineGroup.prototype.update = function() {
    var children = this.computedChildren;
    for (var i = 0; i < children.length; i++) {
        var child = children[i];

        child.segment = child.segment || new Scanline.Segment();

        if (child.calculateVertices) {
            child.calculateVertices();
            var vert = child.vertexData;
            child.segment.update(vert[6], vert[7], vert[4], vert[5]);
        } else {
            var x = child.worldTransform.tx, y = child.worldTransform.ty;
            child.segment.update(x - 5, y, x + 5, y);
        }
    }

    this.scanline.process(children, children);
};

module.exports = ScanlineGroup;
