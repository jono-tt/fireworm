var Dir = require('../lib/dir')
var EventEmitter = require('events').EventEmitter
var spy = require('ispy')
var bd = require('bodydouble')
var assert = require('insist')
var exec = require('child_process').exec
var path = require('path')
var fs = require('fs')
var rimraf = require('rimraf')

suite('Dir', function(){

  test('create should emit add event', function(){
    var sink = bd.mock(new EventEmitter)
    new Dir(dirpath, sink)
    assert.deepEqual(sink.emit.lastCall.args, 
      ['add', dirpath])
  })

  test('updates contents', function(done){
    var sink = new EventEmitter
    var dir = new Dir(dirpath, sink)
    dir.update(function(){
      assert.deepEqual(Object.keys(dir.entries), ['one.txt'])
      done()
    })
  })

  test('fires `change` when file modified', function(done){
    setTimeout(function(){
      var sink = new EventEmitter
      var dir = new Dir(dirpath, sink)
      dir.update(function(){
        touch(path.join(dirpath, 'one.txt'))
        sink.on('change', function(pth){
          assert.equal(pth, path.join(dirpath, '/one.txt'))
          done()
        })
      })
    }, 1000)
  })

  test('fires `add` initially for each file', function(done){
    var sink = new EventEmitter
    var dir = new Dir(dirpath, sink)
    dir.update()
    sink.on('add', function(pth){
      assert.equal(pth, path.join(dirpath, 'one.txt'))
      done()
    })
  })

  test('doesnt fire `add` initially if dontFireInitial', function(done){
    var sink = new EventEmitter
    var dir = new Dir(dirpath, sink, {
      dontFireInitial: true
    })
    var onAdd = spy()
    sink.on('add', onAdd)
    dir.update(function(){
      assert(!onAdd.called, 'shouldnt have called')
      done()
    })
  })

  test('fires `add` when file created', function(done){
    var sink = new EventEmitter
    var dir = new Dir(dirpath, sink)
    dir.update(function(){
      touch(path.join(dirpath, 'two.txt'))
      sink.once('add', function(pth){
        assert.equal(pth, path.join(dirpath, 'two.txt'))
        fs.unlinkSync(path.join(dirpath, 'two.txt'))
        done()
      })
    })
  })

  test('watches for modification on new files', function(done){
    this.timeout(4000)
    var sink = new EventEmitter
    var dir = new Dir(dirpath, sink)
    var twopath = path.join(dirpath, 'two.txt')
    dir.update(function(){
      touch(twopath)
      sink.on('add', function(pth){
        assert.equal(pth, twopath)
        setTimeout(function(){
          touch(twopath)
        }, 700)
        sink.on('change', function(pth){
          assert.equal(pth, twopath)
          fs.unlinkSync(twopath)
          done()
        })
      })
    })
  })

  test('fires `remove` when fire is removed', function(done){
    var sink = new EventEmitter
    var dir = new Dir(dirpath, sink)
    var onepath = path.join(dirpath, 'one.txt')
    dir.update(function(){
      fs.unlink(onepath)
      sink.on('remove', function(pth){
        assert.equal(pth, onepath)
        done()
      })
    })
  })

  test('fires `remove` and `add` if file is renamed', function(done){
    var sink = new EventEmitter
    var dir = new Dir(dirpath, sink)
    var onepath = path.join(dirpath, 'one.txt')
    var twopath = path.join(dirpath, 'two.txt')
    dir.update(function(){
      fs.rename(onepath, twopath)

      var removed = false
      var added = false
      sink.on('remove', function(pth){
        assert.equal(pth, onepath)
        removed = true
        if (added && removed) done()
      })

      sink.on('add', function(pth){
        assert.equal(pth, twopath)
        added = true
        if (added && removed) done()
      })

    })
  })

  var dirpath

  beforeEach(function(){
    dirpath = path.join('tests', 'data', String(Math.ceil(Math.random() * 1000)))
    fs.mkdirSync(dirpath)
    fs.writeFileSync(path.join(dirpath, 'one.txt'), '')
  })

  afterEach(function(){
    rimraf.sync(dirpath)
  })

})

function touch(filepath, callback){
  filepath = path.normalize(filepath)
  exec('touch -m ' + filepath, callback)
}