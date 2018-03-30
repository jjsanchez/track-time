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
  db.each("SELECT * from tasks", (err, row) => {
    if (err) {
      return console.log(err.message);
    }
    console.log("Id: %s, Type: %s, Name: %s, Lut: %s, Duration: %s, Running: %s", row.id, row.type, row.name, row.lut, row.duration, row.running);
  });
}

async function startTask(taskId) {
  let lut = Math.floor(new Date().getTime() / 1000);

  var runningTask = await db.getAsync(`SELECT * from tasks WHERE running=1`);
  if (runningTask) {
    let duration = runningTask.duration + (lut - runningTask.lut);
    db.runAsync(`UPDATE tasks SET running=0, duration=${duration}, lut=${lut} WHERE id=${runningTask.id}`);
  }
  db.runAsync(`UPDATE tasks SET running=1, lut=${lut} WHERE id=${taskId}`);
}

// --------------------------

async function main() {
  await bootstrapDb();

  program
    .version('1.0')
    .option('-c, --clear', 'Clear all tasks')
    .option('-a, --add <task>', `Add task <'id#name#type'>`)
    .option('-l, --list', 'list tasks')
    .option('-s, --start <taskId>', 'Stat task with <taskId>')
    .parse(process.argv);

  if (program.clear) await clearTasks();
  if (program.add) await addTask(program.add);
  if (program.list) listTasks();
  if (program.start) await startTask(program.start);


  db.close();
}

main();