const userController = require("../controllers/userController")
const jwt = require('jsonwebtoken')

//------------------------------------*Authentication*--------------------------------------------------//




const authentication = async function(req, res, next) {

    try {
        const bearerHeader = req.header('Authorization', 'Bearer Token')

        if (!bearerHeader) {
            return res.status(400).send({ status: false, msg: "token is required" })
        }
        const bearer = bearerHeader.split(' ');
        console.log(bearer)
        const token = bearer[1];
        let decodetoken = jwt.verify(token, "rushi-159")
        if (!decodetoken) {
            return res.status(401).send({ status: false, msg: "please enter the right token" })
        }

        req.userId = decodetoken.userId
        next()

    } catch (error) {
        return res.status(500).send({ status: false, msg: error.message })

    }


}



// --------------------------------------Authorization------------------------------------------------------ //


// const authorization = async function(req, res, next) {
//     try {
//         const userId = req.params.userId
//         const decodedToken = req.decodedToken

//         if (!(userId)) {
//             return res.status(400).send({ status: false, message: " enter a valid userId" })
//         }

//         const userByUserId = await UserModel.findById(userId)


//         if (!userByUserId) {
//             return res.status(404).send({ status: false, message: " user not found" })
//         }

//         if (userId !== decodedToken.userId) {
//             return res.status(403).send({ status: false, message: "unauthorized access" })
//         }

//         next()

//     } catch (error) {
//         return res.status(500).send({ status: false, msg: error.message })

//     }
// }



// module.exports.authorization = authorization;
module.exports.authentication = authentication;
