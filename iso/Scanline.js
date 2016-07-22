var PIXI = require("pixi.js");

function Scanline() {
    //only pooled stuff here is allowed
    this.segments = [];
    this.segOutput = [];
    this.heap = new EventHeap();
    this.tree = new List();
    this.queue = [];
    //events are taken and returned into pool
    this.eventPool = [];
    //segment pool is different: we dont know when segment will be freed,
    // so we keep all segments there and remember how many were taken
    this.segPool = [];
    this.segPoolNum = 0;
};

var EPS = 1e-5;

Scanline.prototype = {
    /**
     * accepts array of children, each of them MUST have a "segment" component
     *
     */
    process: function(input, output) {
        this._init(input);
        this._scanLine();
        this._topSort();
        this._chooseBest();
        output.length = 0;
        for (var i = 0; i < this.segOutput.length; i++) {
            var owner = this.segOutput[i].owner;
            owner.scanlinePos = i + 1;
            output.push(owner);
        }
        this._clean();
    },

    _init: function(childs) {
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

    _insertAfter: function(seg, lb) {
        var tree = this.tree;
        tree.insertAfter(seg, lb);
        seg.alive = true;
        var x;

        if (seg.next) {
            x = seg.intersect(seg.next);
            if (x !== false) {
                this.heap.push(this._eventCreate(x, 1, seg, seg.next));
            }
        }

        if (seg.prev) {
            x = seg.prev.intersect(seg);
            if (x !== false) {
                this.heap.push(this._eventCreate(x, 1, seg.prev, seg));
            }
        }
    },

    _remove: function(seg) {
        var tree = this.tree;

        if (seg.prev && seg.next) {
            x = seg.prev.intersect(seg.next);
            if (x !== false) {
                this.heap.push(this._eventCreate(x, 1, seg.prev, seg.next));
            }
        }

        seg.alive = false;
        tree.remove(seg);
    },

    _scanLine: function() {
        var heap = this.heap;
        var tree = this.tree;
        while (!heap.isEmpty()) {
            var event = heap.pop();
            var seg = event.seg;
            if (event.type === 2) {
                //insert new segment
                var lb = tree.lowerBound(seg);
                this._insertAfter(seg, lb);
            } else if (event.type == 0) {
                //remove last segment tail
                seg = seg.childTail;
                if (seg.alive) {
                    seg.alive = false;
                    this._remove(seg);
                }
            } else if (event.type === 1) {
                var seg2 = event.seg2;
                //cut
                //list.moveUp(seg);
                if (seg.alive && seg2.alive) {
                    if (seg.cutLen(event.x) < seg2.cutLen(event.x)) {
                        this._remove(seg);
                        var cut = seg.cut(event.x, this._segCreate());
                        var lb = tree.lowerBound(cut, seg2);
                        this._insertAfter(cut, lb);
                    } else {
                        this._remove(seg2);
                        var cut = seg2.cut(event.x, this._segCreate());
                        //TODO: go down instead up?
                        var lb = tree.lowerBound(cut, null);
                        this._insertAfter(cut, lb);
                    }
                }
            }
            this._eventDestroy(event);
        }

        if (tree.head !== null) {
            console.log("Scanline Assertion: list have some elements after scan")
        }
    },

    _topSort: function() {
        var queue = this.queue;
        queue.length = 0;
        var segments = this.segments;
        var segPool = this.segPool;
        var segPoolLen = this.segPoolNum;

        //push into queue both segments and pooled stuff
        for (var i = 0; i < segments.length; i++) {
            if (segments[i].inboundCounter === 0) {
                queue.push(segments[i]);
                segments[i].alive = true;
            }
        }
        for (var i = 0; i < segPoolLen; i++) {
            if (segPool[i].inboundCounter === 0) {
                queue.push(segPool[i]);
                segPool[i].alive = true;
            }
        }

        for (var qcur = 0; qcur < queue.length; qcur++) {
            var next = queue[qcur].nextEdges;
            for (var i = 0; i < next.length; i++) {
                if (next[i].inboundCounter > 0) {
                    next[i].inboundCounter--;
                }
                if (next[i].inboundCounter !== 0) {
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

        if (queue.length < segments.length + segPoolLen) {
            console.log("Scanline Assertion: some segments were not accounted for");
            for (var i = 0; i < segments.length; i++) {
                if (!segments[i].alive) {
                    queue.push(segments[i]);
                }
            }
            for (var i = 0; i < segPoolLen.length; i++) {
                if (!segPool[i].alive) {
                    queue.push(segPool[i]);
                }
            }
        }
    },

    _chooseBest: function() {
        var segments = this.segments;
        for (var i = 0; i < segments.length; i++) {
            segments[i].findBestChild();
        }

        var output = this.segOutput;
        var queue = this.queue;
        for (var i=0; i < queue.length;i++) {
            var seg = queue[i];
            var head = seg.childHead;
            if (head.bestChild === seg) {
                output.push(head);
            }
        }
    },

    _clean: function() {
        var segments = this.segments;
        for (var i = 0; i < segments.length; i++) {
            segments[i].clear();
        }
        this.segOutput.length = 0;
        this.segments.length = 0;
        this.queue.length = 0;

        //free all segments in pool
        while (this.segPoolNum > 0) {
            this.segPool[--this.segPoolNum].clear();
        }
    },
    //POOLS
    _segCreate: function() {
        //segment pool
        var s = this.segPool[this.segPoolNum];
        if (!s) {
            s = new Segment();
            this.segPool.push(s);
        }
        this.segPoolNum++;
        return s;
    },

    _segDestroy: function(s) {
        s.clear();
        this.segPool.push(s);
    },

    _eventCreate: function(x, type, seg, seg2) {
        var p = this.eventPool.pop();
        if (!p) {
            p = new Event(type, x, seg, seg2);
        } else {
            p.set(type, x, seg, seg2);
        }
        return p;
    },

    _eventDestroy: function(event) {
        event.clear();
        this.eventPool.push(event);
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

    this.alive = false;

    this.childHead = this;

    this.childTail = this;

    this.bestChild = null;
};

Segment.prototype = {
    clear: function () {
        this.nextEdges.length = 0;
        this.inboundCounter = 0;

        this.childHead = this;
        this.childTail = this;

        this.next = null;
        this.prev = null;
        this.owner = null;
        this.alive = false;
        this.len = 0;
        this.bestChild = null;
    },

    cut: function(x, seg) {
        var head = this.childHead;
        seg.childHead = head;
        head.childTail = seg;

        this.len = x - this.x1;

        head.checkBest(this);

        seg._k = this._k;
        seg._b = this._b;
        seg.x1 = x;
        seg.y1 = x * this._k + this._b;
        seg.x2 = this.x2;
        seg.y2 = this.y2;
        seg.owner = this.owner;
        return seg;
    },

    cutLen: function(x) {
        return Math.min(x - this.x1, this.x2 - x);
    },

    checkBest(child) {
        if (this.bestChild === null ||
            this.bestChild.len < child.len) {
            this.bestChild = child;
        }
    },

    findBestChild() {
        var tail = this.childTail;
        tail.len = tail.x2 - tail.x1;
        this.checkBest(tail);
        return this.bestChild;
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
        this._b = this.y1 - this._k * this.x1;
    },

    /**
     * intersects two horizontal segments
     *
     * @param seg2 {Segment} another segment
     */
    intersect: function (seg2) {
        if (this._k === seg2._k) {
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
        otherSegment.inboundCounter++;
        this.nextEdges.push(otherSegment);
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
    lowerBound: function (elem, from) {
        var t = this.head;
        var ans = null;
        if (from) {
            ans = from;
            t = from.next;
        }
        while (t !== null && t.below(elem)) {
            ans = t;
            t = t.next;
        }
        return ans;
    },
    insertAfter: function (elem, where) {
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
            // elem.prev.addEdge(elem);
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

function Event(type, x, seg, seg2) {
    this.type = type;
    this.x = x;
    this.seg = seg;
    this.seg2 = seg2;
};

Event.prototype = {
    clear: function () {
        this.seg = null;
    },
    set: function (type, x, seg, seg2) {
        this.type = type;
        this.x = x;
        this.seg = seg;
        this.seg2 = seg2;
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
        return this.arr.length === 1;
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
            if (arr[min].x < arr[num].x ||
                arr[min].x === arr[num].x && arr[min].type < arr[num].type) {
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
