//jshint esversion:6

require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const _ = require("lodash");
const e = require('express');

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));


//Database connection
mongoose.connect("mongodb+srv://" + process.env.DATABASE_NAME + ":" + process.env.DATABASE_PASSWORD + "@cluster0-oql7h.mongodb.net/todolistDB",
{
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false
});
mongoose.set('useFindAndModify', false);

//items in a todo list
const itemsSchema = {
  name: String,
  completed: {type: Number, default: 0},
  time: Number,
  date: String,
  dateFinished: Number,
  units: String
};

const Item = mongoose.model("Item", itemsSchema);

//for custom lists
const listSchema = {
  name: String,
  items: [itemsSchema]
};

const List = mongoose.model("List", listSchema);

//home page
app.get("/", function(req, res) {
  Item.find({}, function(err, foundItems){
      res.render("list", {listTitle: "Today", newListItems: foundItems});
  });
});

//custom pages
app.get("/:customListName", function(req, res) {

  //capatalize name of list
  const customListName = _.capitalize(req.params.customListName);

  //find list in database
  List.findOne({name: customListName}, function(err, foundList){
    if (!err){
      if (!foundList){
        //Create a new list
        const list = new List({
          name: customListName,
        });
        list.save();
        res.redirect("/" + customListName);
      } else {
        //Show an existing list
        res.render("list", {listTitle: foundList.name, newListItems: foundList.items});
      }
    }
  });
});

//add button pressed
app.post("/", function(req, res) {
  //posts items
  const itemName = req.body.newItem;//name of item
  const listName = req.body.list;//name of page
  //keep track of date and time for item
  var time = new Date().getTime();
  var date = new Date(time).toString().substring(4,15);

  //create new item
  const item = new Item ({
    name: itemName,
    completed: 0,
    time: time,
    date: date,
    dateFinished: "",
    units: "Not finished yet"
  });

  //in the default page simply save items
  if (listName === "Today") {
    item.save();
    res.redirect("/");
  } else {
    //create new custom list or go to existing one
    List.findOne({name: listName}, function(err, foundList) {
      foundList.items.push(item);
      foundList.save();
      res.redirect("/" + listName);
    });
  }
});

//if user creates new list
app.post("/list", function(req, res) {
  const newList = req.body.newList;
  res.redirect("/" + newList);
});

//if delete or checkbox is pressed
app.post("/delete", function(req, res) {

  //find ID of items that user interacts with
  const ip = req.ip;
  const deleteId = req.body.trash;
  const checkedItemId = req.body.checkbox;
  const listName = req.body.listName;
  const editId = req.body.edit;

  //once the button is pressed create a new date
  let dateEnd = new Date();
  dateEnd = dateEnd.getTime();

  //home page
  if (listName === "Today") {

    //find the item that is checked
    Item.findById(checkedItemId, function(err, item){
      if (!err) {
        if (item != null) {
          //if the item is not completed yet make it completed
          if(item.completed === 0) {
            item.completed++;
          }
          //otherwise remove completion status
          else {
            item.completed--;
          }

          //find the time elapsed between start and completion
          let elapsed = dateEnd - item.time; //elapsed time of item
          let elapsedString = "seconds";

          //convert from ms to seconds
          elapsed /= 1000;

          //convert from seconds to days if at least one day
          if (elapsed > 86400) {
            elapsed /= 86400;
            elapsedString = "days";
          }

          //convert from seconds to hours if at least one hour
          if (elapsed > 3600) {
            elapsed /= 3600;
            elapsedString = "hours";
          }

          //convert from seconds to minutes if at least 1 minute
          if (elapsed > 60) {
            elapsed /= 60;
            elapsedString = "minutes";
          }

          //round the time and change database values
          elapsed = Math.round(elapsed);
          item.dateFinished = elapsed;
          item.units = elapsedString;
          item.save();
        }
      }
    });
    if (ip === "::1") {
      //if delete button is pressed find it and delete it
      Item.findByIdAndRemove(deleteId, function(err, foundItem) {
        if(!err) {
          res.redirect("/");
        }
      });
    } else {
      res.redirect("/");
    }

  //if the user checks or deletes an item in a custom list
  } else {

    //find the custom list in the database
    List.findOne({name: listName}, function(err, foundList){
      if (!err){
        //for each list update completion status
        for (var i = 0; i < foundList.items.length; i++)
        {

          //if the item matches the item that was checked
          if (foundList.items[i]._id == checkedItemId)

            //if not completed yet update to completed
            if(foundList.items[i].completed === 0) {
              foundList.items[i].completed++;
            }
            //otherwise remove completion status
            else {
              foundList.items[i].completed--;
            }
          if (foundList.items[i]._id == checkedItemId) {

            //find time elapsed from start to completion and convert to proper units
            let elapsed = dateEnd - foundList.items[i].time;
            let elapsedString = "seconds";
            elapsed /= 1000;
            if (elapsed > 86400) {
              elapsed /= 86400;
              elapsedString = "days";
            }
            if (elapsed > 3600) {
              elapsed /= 3600;
              elapsedString = "hours";
            }
            if (elapsed > 60) {
              elapsed /= 60;
              elapsedString = "minutes";
            }
            //update item in database
            elapsed = Math.round(elapsed);
            foundList.items[i].dateFinished = elapsed;
            foundList.items[i].units = elapsedString;
      }
    }
    foundList.save();
    //delete item from custom list
    List.findOneAndUpdate({name: listName}, {$pull: {items: {_id: deleteId}}}, function(err, foundList){
      if (!err){
        res.redirect("/" + listName);
      }
    });
  }
    });
  }


});

app.get("/about", function(req, res){
  res.render("about");
});

let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

app.listen(port, function() {
  console.log("Server Started...");
});
