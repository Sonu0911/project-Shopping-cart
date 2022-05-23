const userModel = require("../models/userModel")
const bcrypt = require('bcrypt')
const aws = require("../aws/aws.js")
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const multer = require('multer')

//=================================VALIDATION================================

const isValid = function(value) {
    if (typeof value === 'undefined' || value === null) return false
    if (typeof value === 'string' && value.trim().length === 0) return false
    return true
}
const isValidPassword = /^[a-zA-Z0-9!@#$%^&*]{8,15}$/

const isValidObjectId = function(objectId) {
    return mongoose.Types.ObjectId.isValid(objectId)
}

const isValid2 = function(value) {
    if (typeof(value) === "string" && (value).trim().length === 0) { return false }
    return true
}

const isValidPhoneNo = /^\+?([6-9]{1})\)?[-. ]?([0-9]{4})[-. ]?([0-9]{5})$/

const isValidEmail = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/

// ============================================CREATE USER===============================================

const createUser = async function(req, res) {
    try {
        let data = req.body
        let files = req.files

        if (Object.keys(data) == 0) return res.status(400).send({
            status: false,
            msg: "No input provided"
        })


        if (files && files.length > 0) {
            //upload to s3 and get the uploaded link
            // res.send the link back to frontend/postman
            let uploadedFileURL = await aws.uploadFile(files[0])
            data.profileImage = uploadedFileURL;
        } else {
            res.status(400).send({ msg: "profileImage is required" })
        }


        if (!isValid(data.fname)) {
            return res.status(400).send({
                status: false,
                msg: "fname is required"
            })
        }


        if (!isValid(data.lname)) {
            return res.status(400).send({
                status: false,
                msg: "lname is required"
            })
        }


        if (!isValidPhoneNo.test(data.phone)) {
            return res.status(400).send({
                status: false,
                msg: "valid phone number is required"
            })
        }


        if (!isValidEmail.test(data.email)) {
            return res.status(400).send({
                status: false,
                msg: "valid email is required"
            })
        }

        if (!isValid(data.password)) {
            return res.status(400).send({
                status: false,
                msg: "Plz enter valid password"
            })
        }


        if (data.password.length < 8 || data.password.length > 15) {
            return res.status(400).send({
                status: false,
                msg: "passowrd min length is 8 and max length is 15"
            })
        }


        const salt = await bcrypt.genSalt(10);
        data.password = await bcrypt.hash(data.password, salt);


        if (!isValid(data.address)) {
            return res.status(400).send({
                status: false,
                msg: "Plz enter address"
            })
        }


        if (!isValid(data.address.shipping)) {
            return res.status(400).send({
                status: false,
                msg: "Plz enter shipping address"
            })
        }


        if (!isValid(data.address.billing)) {
            return res.status(400).send({
                status: false,
                msg: "Plz enter billing address"
            })
        }


        if (!isValid(data.address.shipping.street)) {
            return res.status(400).send({
                status: false,
                msg: "Plz enter shipping street"
            })
        }


        if (!isValid(data.address.shipping.city)) {
            return res.status(400).send({
                status: false,
                msg: "Plz enter shipping city"
            })
        }


        if (!/^[1-9]{1}[0-9]{5}$/.test(data.address.shipping.pincode)) {
            return res.status(400).send({
                status: false,
                msg: "Plz enter shipping pincode"
            })
        }


        if (!isValid(data.address.billing.street)) {
            return res.status(400).send({
                status: false,
                msg: "Plz enter billing street"
            })
        }


        if (!isValid(data.address.billing.city)) {
            return res.status(400).send({
                status: false,
                msg: "Plz enter billing city"
            })
        }


        if (!/^[1-9]{1}[0-9]{5}$/.test(data.address.billing.pincode)) {
            return res.status(400).send({
                status: false,
                msg: "Plz enter billing pincode"
           })

        }


        // if (!isValid(data.address)) {
        //     return res.status(400).send({ status: false, message: 'please provide Address' })
        // }
        // let address = JSON.parse(data.address)
        // let { shipping, billing } = address

        // if (!(address.shipping)) {
        //     return res.status(400).send({ status: false, message: 'please provide shipping Address' })
        // }
        // if (!(address.shipping.street)) {
        //     return res.status(400).send({ status: false, message: 'please provide shipping street' })
        // }
        // if (!(address.shipping.city)) {
        //     return res.status(400).send({ status: false, message: 'please provide shipping city' })
        // }
        // if (!(address.shipping.pincode)) {
        //     return res.status(400).send({ status: false, message: 'please provide shipping pincode' })
        // }
        // if (!/^[1-9]{1}[0-9]{5}$/.test(address.shipping.pincode)) {
        //     return res.status(400).send({ status: false, message: 'please provide shipping pincode in digits' })
        // }
        // if (!(address.billing)) {
        //     return res.status(400).send({ status: false, message: 'please provide billing Address' })
        // }
        // if (!(address.billing.street)) {
        //     return res.status(400).send({ status: false, message: 'please provide billing street' })
        // }
        // if (!(address.billing.city)) {
        //     return res.status(400).send({ status: false, message: 'please provide billing city' })
        // }
        // if (!(address.billing.pincode)) {
        //     return res.status(400).send({ status: false, message: 'please provide billing pincode' })
        // }
        // if (!/^[1-9]{1}[0-9]{5}$/.test(address.billing.pincode)) {
        //     return res.status(400).send({ status: false, message: 'please provide billing pincode in digits' })
        // }


        //=================================== duplicate data =============================================


        let dupliPhone = await userModel.find({ phone: data.phone })
        if (dupliPhone.length > 0) {
            return res.status(400).send({
                status: false,
                msg: "phone number already exits"
            })
        }


        let dupliEmail = await userModel.find({ email: data.email })
        if (dupliEmail.length > 0) {
            return res.status(400).send({
                status: false,
                msg: "email is already exists"
            })
        }


        // ============================================================================================

        let savedData = await userModel.create(data)
        res.status(201).send({
            status: true,
            msg: "user created successfully",
            msg2: savedData
        })


    } catch (error) {
        res.status(500).send({
            status: false,
            msg: error.message
        })
    }
}

// =====================================LOGIN USER===========================================

const loginUser = async function(req, res) {
    try {
        let user = req.body

        if (Object.keys(user) == 0) {
            return res.status(400).send({
                status: false,
                msg: "please provide data"
            })
        }


        let userName = req.body.email
        let password = req.body.password


        if (!userName) {
            return res.status(400).send({
                status: false,
                msg: "userName is required"
            })
        }


        if (!password) {
            return res.status(400).send({
                status: false,
                msg: "password is required"
            })
        }


        let userEmailFind = await userModel.findOne({ email: userName })
        if (!userEmailFind) {
            return res.status(400).send({
                status: false,
                msg: "userName is not correct"
            })
        };


        bcrypt.compare(password, userEmailFind.password, function(err, result) {
            if (result) {
                let token = jwt.sign({
                    userId: userEmailFind._id,
                    iat: Math.floor(Date.now() / 1000),
                    exp: Math.floor(Date.now() / 1000) + 10 * 60 * 60
                }, "rushi-159");

                const userData = {
                    userId: userEmailFind._id,
                    token: token
                }
                res.status(200).send({
                    status: true,
                    message: "user login successfully",
                    data: userData
                });
            } else {
                return res.status(401).send({
                    status: true,
                    message: "plz provide correct password"
                })
            }
        })


    } catch (error) {
        return res.status(500).send({
            status: false,
            msg: error.message
        })
    }

}

// ==============================================GET USER============================================

const getUser = async function(req, res) {
    try {
        let userId = req.params.userId.trim()

        if (!isValidObjectId(userId)) {
            return res.status(400).send({
                status: false,
                msg: "path param is invalid"
            })
        }

        const findUser = await userModel.findOne({ _id: userId, isDeleted: false })
        if (!findUser) {
            return res.status(404).send({
                status: false,
                msg: "could not found"
            })
        }

        if (req.userId != findUser._id) {
            res.status(403).send({ status: false, message: "userId in params and token are not same" })
            return
        }

        return res.status(200).send({
            status: true,
            msg: "user found",
            data: findUser
        })


    } catch (error) {
        return res.status(500).send({
            status: false,
            msg: error.message
        })
    }
}

const userUpdate = async(req, res) => {
    try {
        let data = req.body
        const profileImage = req.files
        let userId = req.params.userId
        let { fname, lname, email, phone, password, address } = data

        if (!profileImage && !Object.keys(data).length > 0) return res.status(400).send({ status: false, message: "Please Provide Some data to update" })

        if (!/^[0-9a-fA-F]{24}$/.test(userId)) {
            return res
                .status(400)
                .send({ status: false, message: "please provide valid UserId" });
        }


        if (profileImage) {
            if (profileImage && profileImage.length > 0) {
                profileImageUrl = await aws.uploadFile(profileImage[0])
                data.profileImage = profileImageUrl;
            }
        }


        if (!isValid2(fname)) {
            res.status(400).send({ status: false, message: "First name can't be empty" })
            return
        }
        if (!isValid2(lname)) {
            res.status(400).send({ status: false, message: "last name can't be empty" })
            return
        }
        if (!isValid2(email)) {
            res.status(400).send({ status: false, message: "Email Id can't be empty" })
            return
        }
        if (!isValid2(phone)) {
            res.status(400).send({ status: false, message: "Mobile No. can't be empty" })
            return
        }
        if (!isValid2(password)) {
            res.status(400).send({ status: false, message: "Password can't be empty" })
            return
        }

        if (address && Object.keys(address).length === 0) {
            return res.status(400).send({ status: false, message: "Address can't be empty" });
        }

        if (typeof address != 'undefined') {
            let { shipping, billing } = address

            if (shipping) {
                let { street, city, pincode } = shipping
                if (!isValid2(street)) {
                    res.status(400).send({ status: false, message: "Shipping Street name can't be empty" })
                    return
                }
                if (!isValid2(city)) {
                    res.status(400).send({ status: false, message: "Shipping City name can't be empty" })
                    return
                }
                if (!isValid2(pincode)) {
                    res.status(400).send({ status: false, message: "Shipping pincode can't be empty" })
                    return
                }
            }

            if (billing) {
                let { street, city, pincode } = billing
                if (!isValid2(street)) {
                    res.status(400).send({ status: false, message: "billing Street name can't be empty" })
                    return
                }
                if (!isValid2(city)) {
                    res.status(400).send({ status: false, message: "billing City name can't be empty" })
                    return
                }
                if (!isValid2(pincode)) {
                    res.status(400).send({ status: false, message: "billing Pincode can't be empty" })
                    return
                }
            }
        }

        // dataToUpdate: {}

        // if (address && Object.keys(address).length === 0) {
        //     return res.status(400).send({ status: false, message: "Address can't be empty" });
        // }

        // if (address) {
        //     address = JSON.parse(address)
        //     if (address.shipping != null) {
        //         if (address.shipping.street != null) {
        //             if (!isValid(address.shipping.street)) {
        //                 return res.status(400).send({ statsu: false, message: 'Please provide street address in shipping address.' })
        //             }
        //             dataToUpdate['address.shipping.street'] = address.shipping.street
        //         }
        //         if (address.shipping.city != null) {
        //             if (!isValid(address.shipping.city)) {
        //                 return res.status(400).send({ statsu: false, message: 'Please provide City  in shipping address.' })
        //             }
        //             dataToUpdate['address.shipping.city'] = address.shipping.city
        //         }
        //         if (address.shipping.pincode != null) {
        //             if (!/^[1-9]{1}[0-9]{5}$/.test((address.shipping.pincode))) {
        //                 return res.status(400).send({ status: false, message: ' Please provide a valid pincode in 6 digits' })
        //             }
        //             dataToUpdate['address.shipping.pincode'] = address.shipping.pincode
        //         }
        //     }

        //     if (address.billing != null) {
        //         if (address.billing.street != null) {
        //             if (!isValid(address.billing.street)) {
        //                 return res.status(400).send({ statsu: false, message: 'Please provide street address in billing address.' })
        //             }
        //             dataToUpdate['address.billing.street'] = address.billing.street
        //         }
        //         if (address.billing.city != null) {
        //             if (!isValid(address.billing.street)) {
        //                 return res.status(400).send({ statsu: false, message: 'Please provide City in Billing address.' })
        //             }
        //             dataToUpdate['address.billing.city'] = address.billing.city
        //         }
        //         if (address.billing.pincode != null) {
        //             if (!/^[1-9]{1}[0-9]{5}$/.test((address.billing.pincode))) {
        //                 return res.status(400).send({ status: false, message: ' Please provide a valid pincode in 6 digits' })
        //             }
        //             dataToUpdate['address.billing.pincode'] = address.billing.pincode
        //         }
        //     }
        // }


        if (data.email && !(isValidEmail.test(email))) {
            res.status(400).send({ status: false, message: 'please provide valid Email ID' })
            return
        }
        if (data.password && !(isValidPassword.test(password))) {
            res.status(400).send({ status: false, message: 'please provide valid password(minLength=8 , maxLength=15)' })
            return
        }
        if (data.phone && !(isValidPhoneNo.test(phone))) {
            res.status(400).send({ status: false, message: 'please provide valid Mobile no.' })
            return
        }
        if (password) {
            const salt = bcrypt.genSaltSync(10);
            const encryptedPass = await bcrypt.hash(password, salt);

            password = encryptedPass
        }

        const isUserIdPresent = await userModel.findOne({ _id: userId, isDeleted: false })
        if (!isUserIdPresent) {
            return res.status(404).send({ status: false, message: "User not found with this userId" })
        }

        const isEmailPresent = await userModel.findOne({ email: email })
        if (isEmailPresent) {
            return res.status(400).send({ status: false, message: "This email is already present you can't upadate it" })
        }
        const isPhonePresent = await userModel.findOne({ phone: phone })
        if (isPhonePresent) {
            return res.status(400).send({ status: false, message: "This Mobile No. is already present you can't upadate it" })
        }

        if (req.userId != isUserIdPresent._id) {
            res.status(403).send({ status: false, message: "You are not authorized to update" })
            return
        }

        let userData = await userModel.findByIdAndUpdate(userId, data, { new: true })
        return res.status(200).send({ status: true, message: "User profile updated", data: userData });


    } catch (err) {
        res.status(500).send({ status: false, message: err.message })
    }
}




//==============================================================================================


module.exports.createUser = createUser
module.exports.loginUser = loginUser,
    module.exports.getUser = getUser,
    module.exports.userUpdate = userUpdate
