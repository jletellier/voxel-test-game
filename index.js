var THREE = require('three');
var OculusBridge = require('./lib/OculusBridge.js');
var oculus = require('./lib/voxel-oculus-vr');
var createEngine = require('voxel-engine');

var game = createEngine({
    generateChunks: false,
    //generate: voxel.generator['Valley'],
    chunkSize: 32,
    chunkDistance: 2,
    texturePath: 'textures/',
    materials: [ [ 'grass', 'dirt', 'grass_dirt' ], 'brick', 'dirt', [ '#000', '#999', '#ccc', '#555', '#999', '#999' ] ], // front, back, top, down, left, right
    materialFlatColor: false,
    worldOrigin: [ 0, 0, 0 ],
    lightsDisabled: true,
    controls: { discreteFire: true, rotationZClamp: Math.PI / 4 }
});
game.appendTo(document.body);

var createPlayer = require('voxel-player')(game);
var avatar = createPlayer();
avatar.position.set(0, 20, 0);
avatar.possess();

var makeFly = require('voxel-fly')(game);
var target = game.controls.target();
game.flyer = makeFly(target);

var blockPosPlace, blockPosErase;
var hl = game.highlighter = require('voxel-highlight')(game, {
    color: 0xff0000
});
hl.on('highlight', function(voxelPos) { blockPosErase = voxelPos; });
hl.on('remove', function(voxelPos) { blockPosErase = null; });
hl.on('highlight-adjacent', function(voxelPos) { blockPosPlace = voxelPos; });
hl.on('remove-adjacent', function(voxelPos) { blockPosPlace = null; });

var currentMaterial = 2;

game.on('fire', function(target, state) {
    var position = blockPosPlace;
    if (position) {
        game.createBlock(position, currentMaterial);
    }
    else {
        position = blockPosErase;
        if (position) game.setBlock(position, 0);
    }
});

var terrain = require('voxel-perlin-terrain');
var terrainGenerator = terrain('awesometerrain', 0, 4);

game.voxels.on('missingChunk', function(chunkPosition) {
    var size = game.chunkSize;
    var voxels = terrainGenerator(chunkPosition, size);
    var chunk = {
        position: chunkPosition,
        dims: [ size, size, size ],
        voxels: voxels
    };
    game.showChunk(chunk);
});

var createSky = require('voxel-sky')({
    game: game,
    //time: 800,
    speed: 0.4
});
var sky = createSky();

game.on('tick', function(delta) {
    sky(delta);
});

// try to connect to oculus
var oculusEffect = null;
var bridge = new OculusBridge({
    'onConnect': function() {
        //if (!oculusEffect) oculusEffect = new oculus(game);
        console.log('we are connected!');
    },
    'onDisconnect': function() {
        console.log('good bye Oculus.');
    },
    'onConfigUpdate': function(config) {
        if (!oculusEffect) oculusEffect = new oculus(game, config);
        console.log('Config: ', config);
    },
    'onOrientationUpdate': bridgeOrientationUpdated,
    'onAccelerationUpdate': function(accelValues) {
        var values = [accelValues.x, accelValues.y, accelValues.z];
        //console.log("Acceleration: " + values.join(", "));
    }
});

bridge.connect();

var camEuler = new THREE.Euler();

function bridgeOrientationUpdated(quatValues) {
    camEuler.setFromQuaternion(quatValues, 'YZX');

    target.pitch.rotation.x = clamp(camEuler.x, game.controls.x_rotation_clamp);
    target.yaw.rotation.y = clamp(camEuler.y, game.controls.y_rotation_clamp);
    target.roll.rotation.z = clamp(camEuler.z, game.controls.z_rotation_clamp);
}

function clamp(value, to) {
    return isFinite(to) ? Math.max(Math.min(value, to), -to) : value
}