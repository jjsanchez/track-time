#!/usr/local/bin/python

import sqlite3
import datetime
import json
import time
from optparse import OptionParser

def clear_tasks(option, opt, value, parser):
    cursor.execute("DELETE from tasks;")

def add_task(option, opt, value, parser):
    id, type, name = value.split("#")
    cursor.execute("INSERT INTO tasks VALUES('{0}', '{1}', '{2}', 0, 0, 0, '{3}');".format(id, name, type, today()))

def start_task(option, opt, value, parser):
    stop_tasks()
    lut = current_time_secs();
    cursor.execute("UPDATE tasks SET running=1, lut={0} WHERE id='{1}'".format(lut, value));

def stop_tasks(option = None, opt = None, value = None, parser = None):
    for row in cursor.execute("SELECT * from tasks WHERE running=1"):
        stop_task(row)

def stop_task(row):
    lut = current_time_secs();
    duration = row[5] + (lut - row[4]);
    cursor.execute("UPDATE tasks SET running=0, duration={0}, lut={1} WHERE id='{2}'".format(duration, lut, row[0]));

def export_tasks(option, opt, value, parser):
    for row in cursor.execute("SELECT * from tasks"):
        print "%s#%s#%s#%s" % (row[6], row[2], row[1], row[5])

def today():
    return datetime.date.today().strftime("%d/%m/%Y")

def current_time_secs():
    return int(round(time.time()))

def update_running_time():
    for row in cursor.execute("SELECT * from tasks WHERE running=1"):
        lut = current_time_secs();
        duration = row[5] + (lut - row[4]);
        cursor.execute("UPDATE tasks SET duration={0}, lut={1} WHERE id='{2}'".format(duration, lut, row[0]));
    db.commit()

def list_tasks():
    update_running_time()
    return [ { 'id': row[0], 'name': row[1], 'type': row[2], 'running': row[3], 'date': str(datetime.timedelta(seconds=row[5])) } for row in cursor.execute("SELECT * from tasks")]

def to_alfred_item(task):
    return {
        "uuid": task["id"],
        "title": "%s - %s" % (task["type"], task["name"]),
        "subtitle": task["date"],
        "arg": task["id"],
    }

def default_alfred_options():
    return [
        {
            "uuid": "item-add",
            "title": "Add new task",
            "arg": "item-add",
        },
        {
            "uuid": "item-stop",
            "title": "Stop tracking time",
            "arg": "item-stop",
        },
        {
            "uuid": "item-export",
            "title": "Export tasks for today",
            "arg": "item-export",
        },
        {
            "uuid": "item-clear",
            "title": "Clear all tasks",
            "arg": "item-clear",
        }
    ]

def alfred_opts(option, opt, value, parser):
    items = map(to_alfred_item, list_tasks())
    items.extend(default_alfred_options())
    obj = {}
    obj["items"] = items

    print json.dumps(obj)

parser = OptionParser()
parser.add_option("-c", "--clear", help="Clear all tasks", action="callback", callback=clear_tasks)
parser.add_option("-a", "--add", type="string",  help="Add task <'id#name#type'>", action="callback", callback=add_task)
#parser.add_option("-l", "--list",  help="List tasks", action="callback", callback=list_tasks)
parser.add_option("-s", "--start", type="string", help="Start task with <taskId>", action="callback", callback=start_task)
parser.add_option("-x", "--stop", help="Stop all tasks", action="callback", callback=stop_tasks)
parser.add_option("-e", "--export", help="Export tasks", action="callback", callback=export_tasks)
parser.add_option("-f", "--alfred", help="Print Alfred options", action="callback", callback=alfred_opts)

db = sqlite3.connect('/tmp/tasks')
cursor = db.cursor()
cursor.execute("CREATE TABLE IF NOT EXISTS tasks(id TEXT, name TEXT, type TEXT, running INTEGER, lut INTEGER, duration INTEGER, day TEXT);")

parser.parse_args()

db.commit()
db.close()
