/// <reference path="../typings/tsd.d.ts" />
'use strict';

console.log('GeometryWorker: online');

var win = <any>self;

win.importScripts('external.js');
win.importScripts('../lib/underscore.js');
win.importScripts('../lib/three.v71.js');

import _ = require('underscore');

import w from './World';
import wg from './WorldGeometry';

var world: w.World;
var worldGeometry: wg.WorldGeometry;

interface Invocation {
  id: number;
  action: string;
  data: any;
}

function init(invocation: Invocation): void {
  world = w.NewWorld(new THREE.Vector3(32, 1, 32), new THREE.Vector3(16, 32, 16));
  
  world.init();

  worldGeometry = wg.NewWorldGeometry(world);

  return win.postMessage({
    id: invocation.id,
    data: {
      partitionBoundaries: world.getPartitionBoundaries(),
      partitionCapacity: world.getPartitionCapacity(),
      blockDimensions: world.getBlockDimensions()
    }
  });
}

self.onmessage = function(e) {
  var invocation = <Invocation>e.data;
  
  if (invocation.action === 'init') {
    return init(invocation);
  }

  if (invocation.action === 'getPartition') {
    var geo = worldGeometry.getPartitionGeometry(invocation.data.index);

    win.postMessage({
      id: invocation.id,
      data: {
        index: invocation.data.index,
        geo: geo
      }
    }, [
      geo.data.position.buffer,
      geo.data.normal.buffer,
      geo.data.uv.buffer,
      geo.data.data.buffer,
      geo.data.offset.buffer
    ]);
  }

  if (invocation.action === 'getBlock') {
    var type = world.getBlock(invocation.data.pos);

    win.postMessage({
      id: invocation.id,
      data: {
        pos: invocation.data.pos,
        type: type
      }
    });
  }

  if (invocation.action === 'setBlocks') {
    world.setBlocks(invocation.data.start, invocation.data.end, invocation.data.type, invocation.data.colour);

    if (invocation.data.update) checkForChangedPartitions();
  }

  if (invocation.action === 'addBlock') {
    world.addBlock(invocation.data.position, invocation.data.side, invocation.data.type);

    checkForChangedPartitions();
  }
};

var checkForChangedPartitions = _.debounce(function() {
  var dirty = world.getDirtyPartitions();

  win.postMessage({
    action: 'update',
    changes: dirty
  });
}, 20);