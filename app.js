//jshint esversion: 6
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const _ = require("lodash");

const app = express();



app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

mongoose.connect("mongodb+srv://admin-sam:Test123@cluster0-oql7h.mongodb.net/todolistDB",
{
  useNewUrlParser: true,
  useUnifiedTopology: true
});
mongoose.set('useFindAndModify', false);

const itemsSchema = {
  name: String
};

const Item = mongoose.model("item", itemsSchema);

const item1 = new Item ({
  name: "Welcome to your to-do list!"
});

const item2 = new Item ({
  name: "Hit + to add a new item."
});

const item3 = new Item ({
  name: "<-- Hit this to delete an item."
});

const defaultItems = [item1, item2, item3];

const listSchema = {
  name: String,
  items: [itemsSchema]
};

const List = mongoose.model("List", listSchema);

app.get("/", function(req, res) {

  Item.find({}, function(err, foundItems) {
    if (foundItems.length === 0) {
      Item.insertMany(defaultItems, function(err) {
        if(err) {
          console.log(err);
        } else {
          console.log("Succesfully inserted");
        }
      });
      res.redirect("/");
    } else {
      res.render("list", {listTitle: "Today", newListItems : foundItems});
    }
  });
});

app.post("/", function(req, res) {

  const itemName = req.body.newItem;
  const listName = req.body.list;

  const item = new Item ({
    name: itemName
  });

  if (listName === "Today") {
    item.save();
    res.redirect("/");
  } else {
    List.findOne({name: listName}, function(err, foundList) {
      foundList.items.push(item);
      foundList.save();
      res.redirect("/" + listName);
    });
  }

});

app.post("/delete", function(req, res) {
  const listName = req.body.listName;
  const checkedItemId = req.body.checkbox;

  if(listName === "Today") {
    Item.findByIdAndRemove(checkedItemId, function(err) {
      if(err) {
        console.log(err);
      } else {
        console.log("Removed");
        res.redirect("/");
      }
    });
  } else {
    List.findOneAndUpdate({name: listName}, {$pull: {items: {_id: checkedItemId}}}, function(err, foundList) {
      if (!err) {
        res.redirect("/" + listName);
      }
    });
  }
});

app.get("/:parameter", function(req, res) {
  parameter = _.capitalize(req.params.parameter);

  List.findOne({name: parameter}, function(err, foundList) {
    if(!err) {
      if(!foundList) {
        //Create a new list
        const list = new List ({
          name: parameter,
          items: defaultItems
        });

        list.save();
        res.redirect("/" + list.name);
      } else {
        //Show existing list
        res.render("list", {listTitle: foundList.name, newListItems : foundList.items});
      }
    }
  });

});

app.post("/work", function(req, res) {
  let item = req.body.newItem;
  workItems.push(item);
  res.redirect("/work");
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
