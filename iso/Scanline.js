var PIXI = require("pixi.js");

function Scanline() {
    //only pooled stuff here
    this.segments = [];
};

var EPS = 1e-5;

Scanline.prototype = {
    process(childs) {
        this._init(childs);
        this._clean();
    },

    _init(childs) {
        var segments = this.segments;
        for (var i = 0; i < childs.length; i++) {
            var seg = childs[i].segment;
            seg.owner = childs[i];
            seg.num = i;
            segments.push(seg);
        }
    },

    _clean() {
        var segments = this.segments;
        for (var i = 0; i < segments.length; i++) {
            segments[i].clear();
        }
        this.segments.length = 0;
    }
};

/**
 * segment, x1 is always less than x2 in it
 * @class
 * @param x1
 * @param y1
 * @param x2
 * @param y2
 * @constructor
 */
function Segment(x1, y1, x2, y2) {

    this.x1 = 0;
    this.x2 = 0;
    this.y1 = 0;
    this.y2 = 0;
    this._k = 0;
    this._b = 0;
    this.update(x1 || 0, y1 || 0, x2 || 0, y2 || 0);

    /**
     * temporary, assigned by Scanline
     * @type {null}
     */
    this.owner = null;

    /**
     * temp number, update order
     * @type {number}
     */
    this.num = 0;

    /**
     * second stage - next segment in the list
     * @type {null}
     */
    this.next = null;


    /**
     * result of the second stage
     * @type {Array}
     */
    this.nextEdges = [];

    /**
     * inbound counter exists for final process of sorting
     * @type {number}
     */
    this.inboundCounter = 0;
};

Segment.prototype = {
    clear: function () {
        this.nextEdges.length = 0;
        this.inboundCounter = 0;
        this.next = null;
        this.owner = null;
    },

    update: function (x1, y1, x2, y2) {
        if (x1 < x2) {
            this.x1 = x1;
            this.y1 = y1;
            this.x2 = x2;
            this.y2 = y2;
        } else {
            this.x1 = x2;
            this.x2 = x1;
            this.y1 = y2;
            this.y2 = y1;
        }

        this._k = (this.y2 - this.y1) / (this.x2 - this.x1);
        this._b = this.x1 - this._k * this.y1;
    },

    /**
     * intersects two horizontal segments
     * @param seg2 {Segment} another segment
     */
    intersectDiagonal: function (seg2) {
        if (this._k !== seg2._k) {
            return false;
        }
        var x = (seg2._b - this._b) / (this._k - seg2._k);
        if (x <= this.x1 || x >= this.x2 ||
            x <= seg2.x1 || x >= seg2.x2) {
            return false;
        }
        return x;
    },

    /**
     * checks if its above or below of seg2 when seg2 is starting
     * @param seg2
     */
    below: function (seg2) {
        var y = seg2.x1 * this._k + this._b;
        return y < seg2.y1 || (y == seg2.y1 && this._k < seg2._k);
    },

    /**
     * TODO
     * @param seg {Segment}
     * @returns {boolean}
     */
    intersectVertical: function (seg) {
        return false;
    }
};

/**
 * wrapper for binary search tree
 * TODO: add pool here
 * @constructor
 */
function List() {
    this.head = null;
    this.tail = null;
}

List.prototype = {
    insert: function (where, elem) {
        if (where === null) {
            elem.next = this.head;
            this.head = elem;
        } else {
            elem.next = where.next;
            where.next = elem;
        }
    }
};

function Event(type, x) {
    this.type = type;
    this.x = x;
};

/**
 * will be needed only for intersections
 * @constructor
 */
function EventHeap() {
    this.arr = [0];
};

EventHeap.prototype = {
    push(event) {
        var arr = this.arr;
        var num = arr.length;
        arr.push(event);
        var par = num >> 1;
        //lets go up
        while (par >= 1 &&
        (arr[par].x > event.x ||
        arr[par].x === event.x && arr[par].type > event.type)) {
            arr[num] = arr[par];
            num = par;
            par = num >> 1;
        }
        arr[num] = event;
    },

    pop() {
        var arr = this.arr;
        var res = arr[1];
        arr[1] = arr[arr.length - 1];
        arr.length--;
        var num = 1;
        //lets go down
        while (num * 2 < arr.length) {
            var min = num * 2;
            var right = num * 2 + 1;
            if (right < arr.length &&
                (arr[right].x < arr[min].x ||
                arr[right].x === arr[min].x && arr[right].type < arr[min].type)) {
                min = right;
            }
            if (arr[num].x < arr[min].x ||
                arr[num].x === arr[min].x && arr[num].type < arr[min].type) {
                var t = arr[num];
                arr[num] = arr[min];
                arr[min] = t;
                num = min;
            } else {
                break;
            }
        }

        return res;
    }
};

Scanline.Segment = Segment;

module.exports = Scanline;