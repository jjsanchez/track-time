#!/usr/bin/env node --harmony

'use strict';

let program = require('commander');
let sqlite3 = require('sqlite3').verbose();
let db = new sqlite3.Database('/tmp/tasks');

db.getAsync = (sql) => {
    return new Promise((resolve, reject) => {
        db.get(sql, (err, row) => {
            if (err)
                reject(err);
            else
                resolve(row);
        });
    });
};

db.runAsync = (sql) => {
    return new Promise((resolve, reject) => {
        db.run(sql, (err) => {
            if (err)
                reject(err);
            else
                resolve();
        });
    })
};

async function bootstrapDb() {
    db.runAsync(`CREATE TABLE IF NOT EXISTS tasks(id TEXT, name TEXT, type TEXT, running INTEGER, lut INTEGER, duration INTEGER);`);
};

async function clearTasks() {
  db.runAsync(`DELETE from tasks;`);
}

async function addTask(task) {
  var parts = task.split("#");
  db.runAsync(`INSERT INTO tasks VALUES(${parts[0]}, '${parts[1]}', '${parts[2]}', 0, 0, 0);`);
}

function listTasks() {
  forEachTask((row) => {
    console.log("Id: %s, Type: %s, Name: %s, Lut: %s, Duration: %s, Running: %s", row.id, row.type, row.name, row.lut, row.duration, row.running);
  });
}

function exportTasks() {
  var today = todayAsString();
  forEachTask((row) => {
    console.log("%s#%s#%s#%s#%s", today,row.id, row.type, row.name, row.duration);
  });
}

function forEachTask(rowCallback) {
  db.each("SELECT * from tasks", (err, row) => {
    if (err) {
      return console.log(err.message);
    }
    rowCallback(row);
  });
}

function todayAsString() {
  var today = new Date();
  var dd = today.getDate();
  var mm = today.getMonth() + 1; //January is 0!
  var yyyy = today.getFullYear();

  if (dd<10) {
    dd = '0'+dd
  }

  if (mm<10) {
    mm = '0'+mm
  }

  return mm + '/' + dd + '/' + yyyy;
}

async function startTask(taskId) {
  var runningTask = await db.getAsync(`SELECT * from tasks WHERE running=1`);
  if (taskId && runningTask && taskId == runningTask.id) {
    return;
  }
  stopRunningTask(runningTask);

  let lut = nowInSecs();
  db.runAsync(`UPDATE tasks SET running=1, lut=${lut} WHERE id=${taskId}`);
}

async function stopRunningTask(runningTask) {
  if (!runningTask) {
    runningTask = await db.getAsync(`SELECT * from tasks WHERE running=1`);
  }

  if (runningTask) {
    let lut = nowInSecs();
    let duration = runningTask.duration + (lut - runningTask.lut);
    db.runAsync(`UPDATE tasks SET running=0, duration=${duration}, lut=${lut} WHERE id=${runningTask.id}`);
  }
}

function nowInSecs() {
  return Math.floor(new Date().getTime() / 1000);
}

// --------------------------

async function main() {
  await bootstrapDb();

  program
    .version('1.0')
    .option('-c, --clear', 'Clear all tasks')
    .option('-a, --add <task>', `Add task <'id#name#type'>`)
    .option('-l, --list', 'list tasks')
    .option('-s, --start <taskId>', 'Start task with <taskId>')
    .option('-x, --stop', 'Stop running task')
    .option('-e, --export', 'Export tasks')
    .parse(process.argv);

  if (program.clear) await clearTasks();
  if (program.add) await addTask(program.add);
  if (program.list) listTasks();
  if (program.start) await startTask(program.start);
  if (program.stop) await stopRunningTask();
  if (program.export) exportTasks();

  db.close();
}

main();
