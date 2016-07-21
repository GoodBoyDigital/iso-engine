var _TICK = 0;
/**
 * Game obj
 * @param {PIXI obj} view
 */
var SpatialHash = function(width, height, size)
{
    this.hash = [];
     // this.hash = {};

    this.width = width || 300;
    this.height = height || 300;

    this.size = size || new PIXI.Point(256 * 0.25, 256 * 0.25);

    this.halfHeight = this.height/2 * this.size.y;

    this.buildHash();
    this.IDGENERATOR = 0;

    this.offset = new PIXI.Point(this.size.x * this.width / 2,this.size.y * this.height / 2);

}

SpatialHash.prototype.buildHash = function()
{
    var width = this.width;
    var height = this.height;

    var size = width * height;

    for (var i = 0; i < size; i++)
    {
        this.hash[i] = [];
    };
}

SpatialHash.prototype.add = function(obj)
{
    // iso object!

    var hitArea = obj.view.getBounds();
    obj.UID = this.IDGENERATOR++;

 //   console.log("ADDING OBJECT", hitArea, obj.UID)
   // hitArea.x += 150 * 256;
   // hitArea.y += 150 * 256;

    if(hitArea.x < 0 || hitArea.y < 0)
    {
 //       console.log(hitArea);

//            consle.lof('')
    }


    var sx = ((hitArea.x + this.halfHeight) / this.size.x) | 0,
        sy = ((hitArea.y + this.halfHeight) / this.size.y) | 0,
        ex = (( hitArea.x + hitArea.width + this.halfHeight)/ this.size.x) | 0,
        ey = (( hitArea.y + hitArea.height + this.halfHeight)/ this.size.y) | 0,
        x, y;

    for(y=sy;y<=ey;y++)
    {

        for(x=sx;x<=ex;x++)
        {
            //TODO take out the floor!
            var id = y * this.width + x;

            if(! this.hash[id] )
            {
                console.log("NO HOME")
            }
            else
            {
//                    //console.log(id);
                this.hash[id].push( obj );
//                    console.log("ADDED " + id, this.hash[id])
            }
        }
    }

 //   //console.log(this.hash)

}

SpatialHash.prototype.retrieveContainer = function(x, y)
{
    var id = y * this.width + x;
 //   //console.log(x + ":"+y + "> " + id)
    return this.hash[id];
}

var temp = [];

SpatialHash.prototype.retrieve2 = function(hitArea)
{
    var shift = 5; // power of two!
//     //console.log(hitArea)

    var sx = ((hitArea.x + this.halfHeight) / this.size.x) | 0,
        sy = ((hitArea.y + this.halfHeight) / this.size.y) | 0,
        ex = (( hitArea.x + hitArea.width + this.halfHeight)/ this.size.x) | 0,
        ey = (( hitArea.y + hitArea.height + this.halfHeight)/ this.size.y) | 0,
        x, y;

    var ret = temp;
    ret.length = 0;

   // //console.log(sx + " : " + sy + "hitArea" + hitArea.y)
 //   //console.log(hitArea.y / this.size.y)
   // //console.log(this.size);

    for(y=sy;y<=ey;y++)
    {
        for(x=sx;x<=ex;x++)
        {
            var id = y * this.width + x;

            if( this.hash[id] )
            {
              //  //console.log(id)
          ///      //console.log(id + " :  " + x + " : " + y + " : " +  this.hash[id])
                ret = ret.concat( this.hash[id] );
            }
        }
    }
//        console.log(items, " <<<<<<");

    var items = this.removeDuplicates(ret);

    //items.sort(depthCompare);

    return items;
}

var tempArray = [];

SpatialHash.prototype.retrieve = function(hitArea)
{

     var sx = ((hitArea.x + this.halfHeight) / this.size.x) | 0,
        sy = ((hitArea.y + this.halfHeight) / this.size.y) | 0,
        ex = (( hitArea.x + hitArea.width  + this.halfHeight)/ this.size.x) | 0,
        ey = (( hitArea.y + hitArea.height + this.halfHeight)/ this.size.y) | 0,
        x, y;

    var ret = []//tempArray;
    var tick = _TICK++;
    var index = 0;

    for(y=sy;y<=ey;y++)
    {
        for(x=sx;x<=ex;x++)
        {
            var id = y * this.width + x;

            var cell = this.hash[id];

            if( cell )
            {
                for (var i = 0; i < cell.length; i++)
                {
                    var item = cell[i];

                    if(item._TICK !== tick)
                    {
                        item._TICK = tick;
                        ret[index++] = item;
                    }

                };
            }
        }
    }

   // console.log(ret);
    return  ret;

}

function depthCompare(a,b)
{
    return ( a.index ) - ( b.index );
}

SpatialHash.prototype.removeDuplicates = function(array)
{
    if(array.length < 2)return array;

    var seen = {};
    var out = [];
    var len = array.length;
    var j = 0;
    for(var i = 0; i < len; i++)
    {
         var item = array[i];
         if(seen[item.UID] !== 1)
         {
               seen[item.UID] = 1;
               out[j++] = item;
         }
    }
    return out;
}

SpatialHash.prototype.remove = function(obj, hitArea)
{
    conole.lod();
    var shift = 5; // power of two!

    var sx = ((obj.position.x + hitArea.x) / this.size.x) | 0,
        sy = ((obj.position.y + hitArea.y) / this.size.y) | 0,
        ex = ((obj.position.x +  hitArea.x + hitArea.width )/ this.size.x) | 0,
        ey = ((obj.position.y +  hitArea.y + hitArea.height)/ this.size.y) | 0,
        x, y;
    for(y=sy;y<=ey;y++)
    {
        for(x=sx;x<=ex;x++)
        {
            var id = y * this.width + x;
            var index = this.hash[id].indexOf(obj);
            if(index !== -1)
            {
                this.hash[id].splice(index);
            }
        }
    }
}

SpatialHash.prototype.clear = function()
{
    this.buildHash();
}

module.exports = SpatialHash;

