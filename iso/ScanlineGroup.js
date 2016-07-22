/**
 * Created by ivanp on 22.07.2016.
 */

var Scanline = require('./Scanline');
var SpriteCut = require('./SpriteCut');

function ScanlineGroup(zIndex, mode) {
    PIXI.DisplayGroup.call(this, zIndex);
    this.scanline = new Scanline();
    this.mode = mode || 1;
    this.cutsPool = [];
    this.cutsNum = 0;
}

ScanlineGroup.prototype = Object.create(PIXI.DisplayGroup.prototype);
ScanlineGroup.prototype.constructor = ScanlineGroup;

ScanlineGroup.prototype.update = function () {
    var children = this.computedChildren;
    for (var i = 0; i < children.length; i++) {
        var child = children[i];

        child.segment = child.segment || new Scanline.Segment();

        if (child.calculateVertices && child.displayFlag !== PIXI.DISPLAY_FLAG.MANUAL_CONTAINER) {
            child.calculateVertices();
            var vert = child.vertexData;
            child.segment.cutRender = true;
            child.segment.update(vert[6], vert[7], vert[4], vert[5]);
        } else {
            var x = child.worldTransform.tx, y = child.worldTransform.ty;
            child.segment.cutRender = false;
            child.segment.update(x - 1, y, x + 1, y);
        }
    }

    if (this.mode < 2) {
        this.scanline.process(children, children);
    } else {
        this.scanline.processV2(children);
    }
    // this.scanline.process(children, children);
};

ScanlineGroup.prototype._renderWebGLContainer = function (renderer, container) {
    container.displayOrder = renderer.incDisplayOrder();
    var children = container.displayChildren;
    if (children && children.length) {
        for (var k = 0; k < children.length; k++) {
            var child = children[k];
            child.displayOrder = renderer.incDisplayOrder();
            if (child.displayFlag) {
                child.renderWebGL(renderer);
            } else {
                child._renderWebGL(renderer);
            }
        }
    }
};

ScanlineGroup.prototype._createCut = function() {
    var cut = this.cutsPool[this.cutsNum];
    if (!cut) {
        cut = new SpriteCut();
        this.cutsPool.push(cut);
    }
    this.cutsNum++;
    return cut;
}

/**
 * tries to cut sprites into multiple parts
 *
 * @param parentContainer
 * @param renderer
 */
ScanlineGroup.prototype.renderWebGL = function (parentContainer, renderer) {
    if (this.mode < 2) {
        PIXI.DisplayGroup.prototype.renderWebGL.call(this, parentContainer, renderer);
        return;
    }

    for (var i = 0; i < this.cutsNum; i++) {
        this.cutsPool[i].clear();
    }

    var list = this.scanline.queue;
    for (var j = 0; j < list.length; j++) {
        var seg = list[j];
        var head = seg.childHead;
        var container = head.owner;
        if (head.cutRender) {
            //CUT CUT CUT
            var x2 = seg.x1 + seg.len;
            if (x2 - seg.x1 >= 1) {
                var cut = this._createCut();
                cut.setHorizontalCut(container, seg.x1, x2);
                cut._renderWebGL(renderer);
            }

            if (head.bestChild === seg) {
                this._renderWebGLContainer(renderer, container);
            }
        } else if (head.bestChild === seg) {
            //default mode, like in DisplayGroup
            if (container.displayFlag) {
                container.renderWebGL(renderer);
            } else {
                container._renderWebGL(renderer);
                this._renderWebGLContainer(renderer, container);
            }
        }
    }

    this.scanline._clean();
};

module.exports = ScanlineGroup;
