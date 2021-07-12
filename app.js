const express = require('express');
const ejs = require('ejs');
const app = express();
const bodyParser = require('body-parser');
const Razorpay = require('razorpay');
const crypto  = require('crypto');
var multer = require('multer');
const path = require('path');
const {GridFsStorage} = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const methodOverride = require('method-override');
var fs = require("fs");

app.use(express.static(__dirname+'/public'));
app.set('view engine','ejs' );
app.use(bodyParser.urlencoded({ extended:true}));
const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
try {
     mongoose.connect(
      'mongodb+srv://Gautam79:Gautam79@cluster0.bqd97.mongodb.net/myFirstDatabase?retryWrites=true&w=majority',
      { useNewUrlParser: true, useUnifiedTopology: true },
      () => console.log(" Database is connected")
    );

  } catch (e) {
    console.log("could not connect database");
  }

var craneSchema = mongoose.Schema({
   fname: String,
   lname: String,
   email: String,
   phoneNumber: Number,
   state: String,
  city: String,
   pName:String,
   zipCode: Number,
   pYear: Number,
   pDesc: String,
   pPrice : Number,
   postedDate : { type: Date, default: Date.now },
   img:{data:Buffer,contentType: String}
  });

var Crane = mongoose.model('Crane',craneSchema);

//Middle ware

var storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'uploads')
    },
    filename: function (req, file, cb) {
      cb(null, file.fieldname + '-' + Date.now()+".png")
    }
  });

 var upload = multer({ storage: storage });
 
 app.post("/sell",upload.single('file'),(req,res)=>{
    var obj = {
        fname: req.body.fname,
        lname: req.body.fname,
        email: req.body.email,
        phoneNumber: req.body.phoneNumber,
        state: req.body.state,
        city: req.body.city,
        zipCode: req.body.zipCode,
        pName : req.body.pName,
        pYear: req.body.pYear,
        pDesc: req.body.pDesc,
        pPrice : req.body.pPrice,
        img: {
            data: fs.readFileSync(path.join(__dirname + '/uploads/' + req.file.filename)),
            contentType: 'image/png'
        }
    }

    Crane.create(obj,function(err,result)
    {
        if(err){
            console.log(err);
        }else{
            console.log("Saved To database");
            console.log(result);
            res.redirect('/buy',);
        }
    });
});

const cartSchema = mongoose.Schema({
    id : String
})
const Cart = mongoose.model('Cart',cartSchema);

app.get('/', function(req, res){
    res.render('home',{})
})


app.get('/buy',function(req,res){
   Crane.find({},function(err,results){
       res.render('buy',{result : results});
       console.log(results);
   });
})

app.get('/sell',function(req,res){
    res.render('sell',{});
});

app.get('/product/:productId',function(req,res){
    Crane.findOne({_id : req.params.productId},function(err,result){
        res.render('productInfo',{result:result});
    });
   
});

app.post('/product/:productId',function(req,res){
    if(req.body.detailsButton == 'details'){
        res.redirect('/product/'+req.params.productId);

    }
    else{
        res.redirect(307,'/cart/'+req.params.productId);
    }
        
   
});



app.post('/cart/:productId',function(req,res){
    const cart  = new Cart({
        id : req.params.productId
    });
    Cart.findOne({id : req.params.productId},function(err,result){
        if(result ==null){
            cart.save();
            console.log("Cart is empty");
            res.redirect('/cart');
        }
        else{
            res.redirect('/cart');
        }
        
    });

});

app.get('/cart',function(req,res){
    Cart.find(function(err,results){
        if(results!=null){
            let craneArray=[]
            for(let i=0;i<results.length;i++){           
                craneArray.push(results[i].id)
            }
            Crane.find({_id:{$in : craneArray}},function(err,res1){
                res.render('cart',{result:res1});
            });

        }
    }) ;
});

app.post('/cart/delete/:productId',function(req,res){
    Cart.deleteOne({id : req.params.productId},function(err,results){
        res.redirect('/cart');
    });
    

});


app.post('/checkout',function(req,res){
    var instance = new Razorpay({
        key_id : 'rzp_test_05nOq9lWk1wAvQ',
        key_secret : 'Jd0HfNAgNPozr0DmjkWwdFs2'

    });
    var options = {
        amount: req.body.totalPrice * 100,  // amount in the smallest currency unit
        currency: "INR",
        receipt: "order_rcptid_11"
      };
    instance.orders.create(options, function(err, order) {
        console.log(order)
       res.render('payment',{order : order})
   
    });

});


app.post('/verify',function(req,res){
    console.log(req.body);
    // generated_signature = hmac_sha256(req.body.order_id + "|" + req.body.payment_id, 'Jd0HfNAgNPozr0DmjkWwdFs2');
    var crypto = require('crypto');
    //creating hmac object 
    var hmac = crypto.createHmac('sha256', 'Jd0HfNAgNPozr0DmjkWwdFs2');
    //passing the data to be hashed
    data = hmac.update(req.body.order_id + "|" + req.body.payment_id);
    //Creating the hmac in the required format
    gen_hmac= data.digest('hex');
    //Printing the output on the console
    res.send({serverSignature : gen_hmac});

});








app.listen(3000,function(res,req){
    console.log('server is running');

});