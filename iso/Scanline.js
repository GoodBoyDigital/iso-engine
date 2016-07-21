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
     */
    process(input, output) {
        this._init(input);
        this._scanLine();
        this._topSort();
        output.length = 0;
        for (var i = 0; i < this.queue.length; i++) {
            var owner = this.queue[i].owner;
            owner.scanlinePos = i + 1;
            output.push(owner);
        }
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
                seg.alive = true;
                var lb = list.lowerBound(seg);
                if (lb !== null) {
                    var x = lb.intersect(seg);
                    if (x !== null) {
                        //for now LETS JUST KILL ONE OF THEM WITH FIRE
                        this.heap.push(this._eventCreate(x, 1, lb));
                    }
                    lb.nextEdges.push(seg);
                }
                list.insertAfter(lb, seg);
            } else if (event.type <= 1) {
                if (seg.alive) {
                    seg.alive = false;
                    list.remove(seg);
                }
                //TODO: create new segment for that thing, for better solution
                // if (event.type === 1) list.moveUp(seg);
            }
        }

        if (list.head !== null) {
            console.log("Scanline Assertion: list have some elements after scan")
        }
    },

    _topSort() {
        var queue = this.queue;
        queue.length = 0;
        var segments = this.segments;

        for (var i = 0; i < segments.length; i++) {
            if (segments[i].inboundCounter === 0) {
                queue.push(segments[i]);
                segments[i].alive = true;
            }
        }

        for (var qcur = 0; qcur < queue.length; qcur++) {
            var next = queue[qcur].nextEdges;
            for (var i = 0; i < next.length; i++) {
                if (next[i].inboundCounter > 0) {
                    next[i].inboundCounter--;
                    continue;
                }
                if (next[i].alive) {
                    //WTF CYCLE
                    console.log("Scanline Assertion: topsort found a cycle");
                    continue;
                }
                next[i].alive = true;
                queue.push(next[i]);
            }
        }

        if (queue.length < segments.length) {
            console.log("Scanline Assertion: some segments were not accounted for");
            for (var i = 0; i < segments.length; i++) {
                if (!segments[i].alive) {
                    queue.push(segments[i]);
                }
            }
        }
    },

    _clean() {
        var segments = this.segments;
        for (var i = 0; i < segments.length; i++) {
            segments[i].clear();
        }
        this.segments.length = 0;
        this.queue.length = 0;
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

    this.alive = false;
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
        this.alive = false;
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

    addEdge: function (otherSegment) {
        this.inboundCounter++;
        this.nextEdges.push(p2);
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
