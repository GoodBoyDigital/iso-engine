var PIXI = require("pixi.js");

function Scanline() {
    //only pooled stuff here is allowed
    this.segments = [];
    this.heap = new EventHeap();
    this.tree = new List();
    this.queue = [];
    this.eventPool = [];
};

var EPS = 1e-5;

Scanline.prototype = {
    /**
     * accepts array of children, each of them MUST have a "segment" component
     *
     * @param childs
     */
    process(sortChildren) {
        this._init(sortChildren);
        this._clean();
    },

    _eventCreate(x, type, seg) {
        return this.eventPool.pop() || new Event(x, type, seg);
    },

    _eventDestroy(event) {
        event.clear();
        this.eventPool.push(event);
    },

    _init(childs) {
        var segments = this.segments;
        for (var i = 0; i < childs.length; i++) {
            var seg = childs[i].segment;
            seg.owner = childs[i];
            seg.num = i;
            segments.push(seg);
            //open
            this.heap.push(this._eventCreate(seg.x1, 2, seg));
            //close
            this.heap.push(this._eventCreate(seg.x2, 0, seg));
        }
    },

    _scanLine() {
        var heap = this.heap;
        var list = this.list;
        while (!heap.isEmpty()) {
            var event = heap.pop();
            var seg = event.seg;
            if (event.type === 2) {
                //insert new segment
                var lb = list.lowerBound(seg);
                if (lb !== null) {
                    var x = lb.intersect(seg);
                    if (x !== null) {
                        this.heap.push(this._eventCreate(x, 1, lb));
                        seg.djoin(lb);
                    }
                    lb.nextEdges.push(seg);
                }
                list.insertAfter(lb, seg);
            } else if (event.type === 1) {
                //TODO: may be create new segment for that thing, for better solution
                list.moveUp(seg);
                //move segment up
            } else if (event.type === 0) {
                list.remove(seg);
            }
        }
    },

    _topSort() {
        var queue = this.queue;


        queue.length = 0;
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
 *
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
     *
     * @type {null}
     */
    this.owner = null;

    /**
     * temp number, update order
     *
     * @type {number}
     */
    this.num = 0;

    /**
     * second stage - next segment in the list
     *
     * @type {null}
     */
    this.next = null;


    /**
     * result of the second stage
     *
     * @type {Array}
     */
    this.nextEdges = [];

    /**
     * inbound counter exists for final process of sorting
     *
     * @type {number}
     */
    this.inboundCounter = 0;

    /**
     * loops counter
     * @type {number}
     */
    this.loopsCounter = 0;
};

Segment.prototype = {
    clear: function () {
        this.nextEdges.length = 0;
        this.inboundCounter = 0;
        this.loopsCounter = 0;
        this.next = null;
        this.prev = null;
        this.prev = null;
        this.owner = null;
        this.djuParent = this;
        this.djuRank = 0;
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
     *
     * @param seg2 {Segment} another segment
     */
    intersect: function (seg2) {
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
     *
     * @param seg2
     */
    below: function (seg2) {
        var y = seg2.x1 * this._k + this._b;
        return y < seg2.y1 || (y == seg2.y1 && this._k < seg2._k);
    },

    /**
     * we dont need that for first version
     *
     * @param seg {Segment}
     * @returns {boolean}
     */
    intersectVertical: function (seg) {
        return false;
    },

    addEdge: function(otherSegment) {
        var p1 = this.djup(), p2 = otherSegment.djup();
        if (p1 !== p2) {
            p2.inboundCounter++;
            p1.nextEdges.push(p2);
        }
    },

    /**
     * called only from djoin
     * @param otherSegment
     */
    addEdges: function (otherSegment) {
        var i, n;

        n = this.nextEdges;
        for (i=0; i<n;i++) {
            while (this.nextEdges[i] && this.nextEdges[i].djup() === this) {
                if (otherSegment.nextEdges.length > 0) {
                    this.nextEdges[i] = otherSegment.nextEdges.pop();
                } else {
                    this.nextEdges[i] = null;
                    this.loopsCounter++;
                }
            }
        }

        n = otherSegment.nextEdges;
        for (i = 0; i < n; i++) {
            var p = otherSegment.nextEdges[i];
            if (p) {
                p = p.djup();
                if (p !== this) {
                    this.nextEdges.push(p);
                    this.inboundCounter++;
                }
            }
        }
    },

    djup: function () {
        var x = this;
        while (x !== x.djuParent) {
            x = x.djuParent;
        }
        var y = this;
        while (y.djuParent !== x) {
            var z = y.djuParent;
            y.djuParent = x;
            y = z;
        }
        return this.djuParent;
    },
    /**
     * together forever^W for this calculation
     *
     * @param seg
     */
    djoin: function (seg) {
        var p1 = this.djup(), p2 = seg.djup();
        if (p1 === p2) {
            return;
        }
        //TODO: add stuff with less edges to stuff with more edges
        if (p1.djuRank < p2.djuRank) {
            p1.djuParent = p2;
            p2.addEdges(p1);
        } else if (p1.djuRank > p2.djuRank) {
            p2.djuParent = p1;
            p1.addEdges(p2);
        } else {
            p1.djuParent = p2;
            p2.djuRank++;
            p2.addEdges(p1);
        }
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
    lowerBound: function (elem) {
        var t = this.head;
        var ans = null;
        if (t !== null && t.below(elem)) {
            ans = t;
            t = t.next;
        }
        return ans;
    },
    insertAfter: function (where, elem) {
        if (where === null) {
            elem.next = this.head;
            elem.prev = null;
        } else {
            elem.next = where.next;
            elem.prev = where;
        }
        if (elem.next) {
            elem.next.prev = elem;
            elem.addEdge(elem.next);
        } else {
            this.tail = elem;
        }
        if (elem.prev) {
            elem.prev.next = elem;
            elem.prev.addEdge(elem);
        } else {
            this.head = elem;
        }
    },
    remove: function (elem) {
        if (elem.next) {
            elem.next.prev = elem.prev;
        } else {
            this.tail = elem.prev;
        }
        if (elem.prev) {
            elem.prev.next = elem.next;
            elem.prev.nextEdges.push(elem.next);
        } else {
            this.head = elem.next;
        }
    },
    moveUp: function (elem) {
        var next = elem.next;
        if (!next) {
            return false;
        }
        this.remove(elem);
        this.insertAfter(next, elem);
        return true;
    }
};

function Event(type, x, seg) {
    this.type = type;
    this.x = x;
    this.seg = seg;
};

Event.prototype = {
    clear: function () {
        this.seg = null;
    }
};

/**
 * will be needed only for intersections
 * @constructor
 */
function EventHeap() {
    this.arr = [0];
};

EventHeap.prototype = {
    push: function (event) {
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

    isEmpty: function () {
        return this.arr.length > 1;
    },

    pop: function () {
        if (this.arr.length === 1) {
            return null;
        }
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
