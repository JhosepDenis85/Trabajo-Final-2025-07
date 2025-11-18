const db = require('../models');

const User = db.user;

exports.allAccess = (req,res)=>{


    res.status(200).send("Contenido Public")
}

exports.onlyUser = async (req, res)=>{

    const user = await User.findById(req.userId).exec();
        if (!user) {
            return res.status(404).send({ message: "Usuario no encontrado" });
        }
    res.status(200).send(`Contenido del Usuario ${user.username}`);
}
exports.onlyModerator = (req,res)=>{
    res.status(200).send("Contenido del Moderator");
}

exports.onlyAdmin = (req,res)=>{
    res.status(200).send("Contenido del Admin");
}