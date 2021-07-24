const express = require('express');
const ejs = require('ejs');
require('dotenv').config();
const app = express();
const bodyParser = require('body-parser');
const Razorpay = require('razorpay');
const crypto  = require('crypto');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const cookieParser = require('cookie-parser');
const FileStore = require('session-file-store')(session);
var multer = require('multer');
const path = require('path');
const {GridFsStorage} = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const methodOverride = require('method-override');
var fs = require("fs");

const mongoose = require('mongoose');
app.use(session({
secret: "Our little secret.",
  resave: false,
  saveUninitialized: false,
  user: {}
}))

function authUser(req,res,next){
    if(req.user==null){
        return res.redirect('/login')
    }
    next();
}
function authAdmin(req,res,next){
    if(!req.session.isAdmin){
        return res.send("You don't have access to this page")
    }
    next();
}

app.use(passport.initialize());
app.use(passport.session());

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
mongoose.set("useCreateIndex", true);
mongoose.set('useFindAndModify', false);
app.use(express.static(__dirname+'/public'));
app.set('view engine','ejs' )
app.use(bodyParser.urlencoded({ extended:true}));





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

const cartSchema = mongoose.Schema({
    user_id : String,
    cartItems : [{
        type: String,
        unique: true
    }
    ]
})
const userSchema =mongoose.Schema({
    email :  String,
    password : String,
    googleId : String,
    email : String
    
})
const orderSchema = mongoose.Schema({
    user_id : String,
    order_id : String,
    payment_id : String,
    orderItems : [{
        type : String,
    }],
    orderedDate : {type: Date,default : Date.now}
    
})
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = mongoose.model('User',userSchema);
const Crane = mongoose.model('Crane',craneSchema);
const Acrane = mongoose.model('Acrane',craneSchema);
const Ccrane = mongoose.model('Ccrane',craneSchema);
const Cart = mongoose.model('Cart',cartSchema);
const Order = mongoose.model('Order',orderSchema);

var storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'uploads')
    },
    filename: function (req, file, cb) {
      cb(null, file.fieldname + '-' + Date.now()+".png")
    }
  });

 var upload = multer({ storage: storage });
passport.use(User.createStrategy());
passport.serializeUser(function(user, done) {
    done(null, user.id);
  });
  
  passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
      done(err, user);
    });
  });
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/craneplus",
    userProfileURL : 'https://www.googleapis.com/oauth2/v3/userinfo'
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id,email : profile.emails[0].value}, function (err, user) { 
      return cb(err, user);
    });
  }
));




app.get('*', function(req, res, next) {
    res.locals.user = req.user || null;
    next();
});


app.get('/', function(req, res){
   
    res.render('home',{})
})


app.get('/buy',function(req,res){
   Crane.find(function(err,results){
        res.render('buy',{result : results});
       console.log(results);
   });
})

app.get('/sell',authUser,function(req,res){
    res.render('sell',{});
})

app.post("/sell",upload.single('file'),authUser,(req,res)=>{
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

    Acrane.create(obj,function(err,result)
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



app.get('/product/:productId',function(req,res){
    Crane.findOne({_id : req.params.productId},function(err,result){
        res.render('productInfo',{result:result})
    });
})


app.post('/product/:productId',function(req,res){
    if(req.body.detailsButton == 'details'){
        res.redirect('/product/'+req.params.productId)

    }
    else{
        res.redirect(307,'/cart/'+req.params.productId)
    }  
})




app.post('/cart/:productId',authUser,function(req,res){


    Cart.findOne({user_id : req.user._id},function(err,foundUser){
        if(foundUser==null){
            const cart  = new Cart({
                    user_id : req.user._id,
                    cartItems:req.params.productId
            })
            cart.save();
            res.redirect('/cart');
        }
        else{
            Cart.findOneAndUpdate({user_id:req.user._id},{$addToSet :{cartItems : req.params.productId}},function(err,success){
                if(err){
                    console.log('coudnot add to cart')
                }
                else{
                    console.log('product added to cart')
                }
            })
            res.redirect('/cart');

        }
    })
})



app.get('/cart',authUser,function(req,res){
    Cart.findOne({user_id : req.user._id},function(err,result){
        let craneArray=[]
        if(result!=null){
            
            for(let i=0;i<result.cartItems.length;i++){           
                craneArray.push(result.cartItems[i])
            }
            

        }
        Crane.find({_id:{$in : craneArray}},function(err,res1){
            res.render('cart',{result:res1});
        })
        
    }) 
})

app.post('/cart/delete/:productId',authUser,function(req,res){
    
    Cart.updateOne({user_id:req.user._id},{$pull : {cartItems :req.params.productId}},function(err,result){
        res.redirect('/cart');
    })
    

})
app.get('/orders',authUser,function(req,res){

    Order.findOne({user_id : req.user._id},function(err,result){
        let craneArray=[]
        if(result!=null){
            
            for(let i=0;i<result.orderItems.length;i++){           
                craneArray.push(result.orderItems[i])
            }
            

        }
        Crane.find({_id:{$in : craneArray}},function(err,res1){
            res.render('orders',{result:res1});
        })

        
    })

})

app.post('/checkout',authUser,function(req,res){
    var instance = new Razorpay({
        key_id : process.env.RAZORPAY_KEY_ID,
        key_secret :process.env.RAZORPAY_KEY_SECRET,

    });
    var options = {
        amount: req.body.totalPrice * 100,  // amount in the smallest currency unit
        currency: "INR",
        receipt: "order_rcptid_11"
      };
    instance.orders.create(options, function(err, order) {
        console.log(order)
        res.locals.user=req.user;
       res.render('payment',{order : order});
   
    });

});



    


app.post('/verifyPayment',authUser,function(req,res){
    console.log(req.body);
    var hmac = crypto.createHmac('sha256', 'Jd0HfNAgNPozr0DmjkWwdFs2');
    data = hmac.update(req.body.razorpay_order_id + "|" + req.body.razorpay_payment_id);
    gen_hmac= data.digest('hex');
    res.locals.user = req.user;
    if(gen_hmac ==  req.body.razorpay_signature){
        Cart.findOne({user_id : req.user._id},function(err,result){
            if(err){

            }
            else{
                const order = new Order({
                    user_id : req.user._id,
                    order_id : req.body.razorpay_order_id,
                    payment_id : req.body.razorpay_payment_id,
                    orderItems : result.cartItems
                })
                order.save();
            }
        })
        Cart.deleteOne({user_id : req.user._id},function(){});
        
        res.render('paymentSuccess',{payment_id :req.body.razorpay_payment_id})
        
        
    }
    else{
       console.log("verification failed")
       res.send({paymentStatus : 'Failed'})
    }

});

app.get('/paymentSuccess',authUser,function(req,res){
    console.log(req.body);
    res.render('paymentSuccess',{});
})




app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile','email'] })
);

app.get("/auth/google/craneplus",
  passport.authenticate('google', { failureRedirect: "/login" }),
  function(req, res) {
      res.locals.user = req.user;
    res.redirect("/");
  });
app.get('/logout',function(req,res){
    req.logout();
    req.session.destroy();

    res.redirect("/");
})
app.get('/login',function(req,res){
    console.log(req.session.user)

    res.render('login',{});
})

app.post('/login',function(req,res){
    const user = new User({
        username: req.body.username,
        password: req.body.password
      });
      req.login(user, function(err){
        if (err) {
          console.log(err);
        } else {
          passport.authenticate("local")(req, res, function(){
            res.locals.user = req.user;
            try{
                if(req.user._id ==process.env.ADMIN_ID){
                    req.session.isAdmin = true;
                    res.redirect('/adminportal')
                    
                }
                else{
                    console.log(req.user._id)
                    res.redirect("/");
                }
            }catch(err){console.log(err)}
            
          });
        }
      });
})
app.post('/register',function(req,res){
    User.register({username: req.body.username}, req.body.password, function(err, user){
        if (err) {
          console.log(err.message);
          res.redirect("/login");
        } else {
          passport.authenticate("local")(req, res, function(){
              res.locals.user = req.user;
            res.redirect('/')
          });
        }
    });

})
app.get('/register',function(req, res){
    res.redirect('/login')

})
app.get('/profile',function(req,res){
    res.render('profile', {})
})
app.get('/adminportal',authAdmin,function(req,res){
    
    Acrane.find(function(err,results){
        res.render('adminPortal',{result : results})
    });
    
})
app.get('/adminportal/:craneId',function(req,res){
    Acrane.findOne({_id :req.params.craneId}).then(function(response){
        res.render('admincrane',{crane : response})
    })
})
app.post('/adminportal/:craneId',function(req,res){
    Acrane.findOne({_id : req.params.craneId}).then(function(result){
        
        const crane = new Crane({
            fname : result.fname,
            lname : result.lname,
            email: result.email,
            phoneNumber: result.phoneNumber,
            state: result.state,
            city: result.city,
            pName:result.pName,
            zipCode: result.zipCode,
            pYear: result.pYear,
            pDesc: result.pDesc,
            pPrice : result.pPrice,
            postedDate : result.postedDate,
            img:result.img,
            approved : true

        });
      
        
        crane.save()
        Acrane.deleteOne({_id : req.params.craneId},function(err,result){
            if(err)
            {
                console.log("Acrane not able to delete");
            }
        })
        res.redirect('/adminportal')
    })
   

})

app.post('/adminportal/reject/:craneId',function(req,res){
    Acrane.deleteOne({_id : req.params.craneId},function(err,result){})
        res.redirect('/adminportal')
        Acrane.save();
    })




app.listen(process.env.PORT,function(res,req){
    console.log('server is running');

})
