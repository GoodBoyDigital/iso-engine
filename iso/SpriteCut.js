function SpriteCut() {
    PIXI.Sprite.call(this, new PIXI.Texture(PIXI.Texture.EMPTY.baseTexture));
}

SpriteCut.prototype = Object.create(PIXI.Sprite.prototype);
SpriteCut.prototype.constructor = SpriteCut;

SpriteCut.prototype.clear = function () {
    this._texture.baseTexture = null;
};

SpriteCut.prototype.setHorizontalCut = function (sprite, x1, x2) {
    this.worldAlpha = sprite.worldAlpha;
    this.tint = sprite.tint;

    var texOut = this._texture;
    var texIn = sprite._texture;
    texOut.baseTexture = texIn.baseTexture;
    texOut._frame.copy(texIn._frame);

    var dataOut = this.vertexData;
    var dataIn = sprite.vertexData;

    var x_beg = dataIn[6];
    var x_end = dataIn[4];

    if (x_end < x_beg) {
        var temp = x1;
        x1 = x2;
        x2 = temp;
    }

    var t1 = (x1 - x_beg) / (x_end - x_beg);
    var t2 = (x2 - x_beg) / (x_end - x_beg);

    dataOut[0] = x1;
    dataOut[1] = dataIn[1] * (1.0 - t1) + dataIn[3] * t1;
    dataOut[2] = x2;
    dataOut[3] = dataIn[1] * (1.0 - t2) + dataIn[3] * t2;
    dataOut[4] = x2;
    dataOut[5] = dataIn[7] * (1.0 - t2) + dataIn[5] * t2;
    dataOut[6] = x1;
    dataOut[7] = dataIn[7] * (1.0 - t1) + dataIn[5] * t1;

    //TODO: handle rotations
    texOut._frame.x = texIn._frame.x + texIn._frame.width * t1;
    texOut._frame.y = texOut._frame.y;
    texOut._frame.width = texIn._frame.width * (t2 - t1);
    texOut._frame.height = texOut._frame.height;
    texOut._updateUvs();
};

SpriteCut.prototype._renderWebGL = function (renderer) {
    renderer.setObjectRenderer(renderer.plugins.sprite);
    renderer.plugins.sprite.render(this);
};

module.exports = SpriteCut;
