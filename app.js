//jshint esversion:6

require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const _ = require("lodash");

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

mongoose.connect("mongodb+srv://" + process.env.DATABASE_NAME + ":" + process.env.DATABASE_PASSWORD + "@cluster0-oql7h.mongodb.net/todolistDB",
{
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false
});
mongoose.set('useFindAndModify', false);

const itemsSchema = {
  name: String,
  completed: {type: Number, default: 0},
  time: Number,
  date: String,
  dateFinished: Number,
  units: String
};

const Item = mongoose.model("Item", itemsSchema);

const listSchema = {
  name: String,
  items: [itemsSchema]
};

const List = mongoose.model("List", listSchema);


app.get("/", function(req, res) {

  Item.find({}, function(err, foundItems){
      res.render("list", {listTitle: "Today", newListItems: foundItems});
  });
});

app.get("/:customListName", function(req, res){
  const customListName = _.capitalize(req.params.customListName);

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

app.post("/", function(req, res) {
  //posts items
  const newList = req.body.newList;
  const itemName = req.body.newItem;//name of item
  const listName = req.body.list;//name of page
  var time = new Date().getTime();
  var date = new Date(time).toString().substring(4,15);
  const item = new Item ({
    name: itemName,
    completed: 0,
    time: time,
    date: date,
    dateFinished: "",
    units: "Not finished yet"
  });

  //if the user makes their own list
  if (newList != null) {
    res.redirect("/" + newList);
  }
  //in the default page simply save items
  if (listName === "Today") {
    item.save();
    res.redirect("/");
  } else {
    //if the user is in a custom list and tries to make a new list
    if (newList != null) {
      res.redirect("/" + newList)
    }
//in all custom pages add new items and push completed items to the bottom
    List.findOne({name: listName}, function(err, foundList) { //find list
      foundList.items.push(item);//store list in array
      let length = foundList.items.length; //number of items in list
      for (var i = 0; i < length; i++) { //loop through every item
        if(foundList.items[i].completed == 1) { //only find completed items
          const item1 = new Item ({ //recreate found item to store at the bottom
            name: foundList.items[i].name,
            completed: 1,
            time: foundList.items[i].time,
            date: foundList.items[i].date,
            dateFinished: foundList.items[i].dateFinished,
            units: foundList.items[i].units
          });
          foundList.items.push(item1); //use array to store items in lists
          List.findOneAndUpdate({name: listName}, {$pull: {items: {_id: foundList.items[i]._id}}}, function(err, foundList){
            if(!err){
              console.log("removed Succesfully"); //removed original item
            }
          });
        }
      }
      foundList.save();
      res.redirect("/" + listName);
    });
  }

});

//if delete or checkbox is pressed
app.post("/delete", function(req, res){
  const deleteId = req.body.trash;
  const checkedItemId = req.body.checkbox;
  const listName = req.body.listName;
  const editId = req.body.edit;

  
  let dateEnd = new Date();
  dateEnd = dateEnd.getTime();
  if (listName === "Today") {
    Item.findByIdAndRemove(checkedItemId, function(err, item){
      if (!err) {
        if (item != null) {
          if(item.completed === 0) {
            item.completed++;
          }
          else {
            item.completed--;
          }
          let elapsed = dateEnd - item.time; //elapsed time of item
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
          elapsed = Math.round(elapsed);
          item.dateFinished = elapsed;
          item.units = elapsedString;
          console.log(item);
          const item1 = new Item({
            name: item.name,
            completed: item.completed,
            time: item.time,
            date: item.date,
            dateFinished: item.dateFinished,
            units: item.units
          });
          //item.save();
          item1.save();
        }
      }
    });
    console.log(deleteId);
    Item.findByIdAndRemove(deleteId, function(err, foundItem) {
      if(!err) {
        res.redirect("/");
      }
    });
  } else {
    List.findOne({name: listName}, function(err, foundList){
      if (!err){
        for (var i = 0; i < foundList.items.length; i++)
        {
          if (foundList.items[i]._id == checkedItemId)
          if(foundList.items[i].completed === 0) {
            foundList.items[i].completed++;
          }
          else {
            foundList.items[i].completed--;
          }
          if (foundList.items[i]._id == checkedItemId) {
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
            elapsed = Math.round(elapsed);
            foundList.items[i].dateFinished = elapsed;
            foundList.items[i].units = elapsedString;
      }
    }
    foundList.save();
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
