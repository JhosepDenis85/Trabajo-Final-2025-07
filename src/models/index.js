const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const db = {};

db.mongoose = mongoose;

db.user = require('./user.model');
db.role = require('./role.model');

db.ROLES = ['admin', 'moderator', 'user'];

db.init =  ()=>{
    db.role.estimatedDocumentCount((err,count)=>{
        if(!err & count === 0){
            new db.role({
                name: "user"
            }).save((error)=>{
                if(error){
                    console.log("Error al crear el Rol user");
                }
                console.log("Rol user creado");
            })
            new db.role({
                name: "moderator"
            }).save((error)=>{
                if(error){
                    console.log("Error al crear el Rol moderator");
                }
                console.log("Rol moderator creado");
            })
            new db.role({
                name: "admin"
            }).save((error)=>{
                if(error){
                    console.log("Error al crear el Rol admin");
                }
                console.log("Rol admin creado");
            })
        }
    })
}


module.exports = db;
