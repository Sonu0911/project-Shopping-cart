const cartModel = require("../models/cartModel");
const userModel = require("../models/userModel");
const productModel = require("../models/productModel");
const aws = require("aws-sdk");
const awsdk = require("../aws/aws");
const mongoose = require("mongoose")

const ObjectId = mongoose.Schema.Types.ObjectId;


//===========================VALIDATION===============================//


const isValid = function(value) {
    if (typeof value === "undefined" || value === "null") return false
    if (typeof value === "string" && value.trim().length === 0) return false
    return true;
}

const isValidObjectId = function(ObjectId) {
    return mongoose.Types.ObjectId.isValid(ObjectId)
}
const isValidRequestBody = function(object) {
    return Object.keys(object).length > 0
}


//================================create cart===================================//

const createCart = async function(req, res) {
    try {
        const requestBody = req.body;
        const userId = req.params.userId;



        // using destructuring
        const { productId, cartId } = requestBody;

        // product id is required
        if (!isValidRequestBody(productId)) {
            return res.status(400).send({
                status: false,
                message: "Product ID is required ",
            });
        }
        // product id should be a valid mongoose ObjectId
        if (!isValidObjectId(productId)) {
            return res
                .status(400)
                .send({ status: false, message: "Product ID is not valid" });
        }

        const productByProductId = await productModel.findOne({
            _id: productId,
            isDeleted: false,
            deletedAt: null,
        });

        if (!productByProductId) {
            return res
                .status(404)
                .send({ status: false, message: `No product found by ${productId}` });
        }
        let productPriceInRupees = productByProductId.price

        if (productByProductId.currencyId !== "INR") {
            // converting product price to INR
            productPriceInRupees = await Convert(productByProductId.price).from(productByProductId.currencyId).to("INR")
        }
        if (userId !== req.userId.toString()) {
            return res.status(403).send({
                status: false,
                message: `User is not allowed to update this cart`,
            });
        }
        // checking whether user has any cart
        const cartByUserId = await cartModel.findOne({ userId: userId });

        if (requestBody.hasOwnProperty("cartId")) {
            // if cart Id is coming from requestBody so first validating cart id then updating cart data
            // cart Id must be a valid mongoose Object Id
            if (!isValidObjectId(cartId)) {
                return res
                    .status(400)
                    .send({ status: false, message: "cartId  is not valid" });
            }

            const cartByCartId = await cartModel.findById(cartId);

            if (!cartByCartId) {
                return res
                    .status(404)
                    .send({ status: false, message: `No cart found by ${cartId}` });
            }

            // if user is not matching in cart found by userId and cart found by cart id that mean some other user's cart id is coming from request body
            if (cartId !== cartByUserId._id.toString()) {
                return res.status(403).send({
                    status: false,
                    message: `User is not allowed to update this cart`,
                });
            }
        }

        //  if cart is not found by userId that mean some other user's cart Id is coming from request body
        if (cartByUserId) {
            // applying higher order function "map" on items array of cart to get an array of product id in string
            const isProductExistsInCart = cartByUserId.items.map(
                (product) => (product["productId"] = product["productId"].toString())
            );

            // if product id coming from request body is present in cart then updating its quantity
            if (isProductExistsInCart.includes(productId)) {
                /* condition :  cartId and items array element which has product id coming from request body
                    update :     totalItems will increase by 1, totalPrice will increase by price of that product 
                    and items array element(product) quantity will increase by one*/

                const updateExistingProductQuantity = await cartModel.findOneAndUpdate({ userId: userId, "items.productId": productId }, {
                    $inc: {
                        totalPrice: +productPriceInRupees,
                        "items.$.quantity": +1,
                    },
                }, { new: true });
                return res.status(200).send({
                    status: true,
                    message: "Product quantity updated to cart",
                    data: updateExistingProductQuantity,
                });
            }

            // if product id coming from request body is not present in cart then we have to add that product in items array of cart
            const aAddNewProductInItems = await cartModel.findOneAndUpdate({ userId: userId }, {
                $addToSet: { items: { productId: productId, quantity: 1 } },
                $inc: { totalItems: +1, totalPrice: +productPriceInRupees },
            }, { new: true });

            return res.status(200).send({
                status: true,
                message: "Item updated to cart",
                data: aAddNewProductInItems,
            });
        } else {
            // if no cart found by userID then creating a new cart the product coming from request body
            const productData = {
                productId: productId,
                quantity: 1,
            };

            const cartData = {
                userId: userId,
                items: [productData],
                totalPrice: productPriceInRupees,
                totalItems: 1,
            };

            const newCart = await cartModel.create(cartData);

            return res
                .status(200)
                .send({
                    status: true,
                    message: "New cart created and product added to cart",
                    data: newCart,
                });
        }
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
};
module.exports.createCart = createCart

// ========================================================================= ////update................................................................
const updateCart = async(req, res) => {
    try {
        let userId = req.params.userId
        let requestBody = req.body;
        let userIdFromToken = req.userId;

        //validation starts.
        if (!isValidObjectId(userId)) {
            return res.status(400).send({ status: false, message: "Invalid userId in body" })
        }

        let findUser = await userModel.findOne({ _id: userId })
        if (!findUser) {
            return res.status(400).send({ status: false, message: "UserId does not exits" })
        }

        //Authentication & authorization
        if (findUser._id.toString() != req.userId) {
            res.status(403).send({ status: false, message: `Unauthorized access! User's info doesn't match` });
            return
        }

        //Extract body
        const { cartId, productId, removeProduct } = requestBody
        // if (!validator.isValidRequestBody(requestBody)) {
        //     return res.status(400).send({ status: false, message: 'Invalid request parameters. Please provide cart details.' })
        // }

        //cart validation
        if (!isValidObjectId(cartId)) {
            return res.status(400).send({ status: false, message: "Invalid cartId in body" })
        }

        let findCart = await cartModel.findById({ _id: cartId })
        if (!findCart) {
            return res.status(400).send({ status: false, message: "cartId does not exists" })
        }

        //product validation
        if (!isValidObjectId(productId)) {
            return res.status(400).send({ status: false, message: "Invalid productId in body" })
        }

        let findProduct = await productModel.findOne({ _id: productId, isDeleted: false })
        if (!findProduct) {
            return res.status(400).send({ status: false, message: "productId does not exists" })
        }

        //finding if products exits in cart
        let isProductinCart = await cartModel.findOne({ items: { $elemMatch: { productId: productId } } })
        if (!isProductinCart) {
            return res.status(400).send({ status: false, message: `This ${productId} product does not exists in the cart` })
        }

        //removeProduct validation either 0 or 1.
        if (!(!isNaN(Number(removeProduct)))) {
            return res.status(400).send({ status: false, message: `removeProduct should be a valid number either 0 or 1` })
        }

        //removeProduct => 0 for product remove completely, 1 for decreasing its quantity.
        if (!((removeProduct === 0) || (removeProduct === 1))) {
            return res.status(400).send({ status: false, message: 'removeProduct should be 0 (product is to be removed) or 1(quantity has to be decremented by 1) ' })
        }

        let findQuantity = findCart.items.find(x => x.productId.toString() === productId)
            //console.log(findQuantity)

        if (removeProduct === 0) {
            let totalAmount = findCart.totalPrice - (findProduct.price * findQuantity.quantity) // substract the amount of product*quantity

            await cartModel.findOneAndUpdate({ _id: cartId }, { $pull: { items: { productId: productId } } }, { new: true })

            let quantity = findCart.totalItems - 1
            let data = await cartModel.findOneAndUpdate({ _id: cartId }, { $set: { totalPrice: totalAmount, totalItems: quantity } }, { new: true }) //update the cart with total items and totalprice

            return res.status(200).send({ status: true, message: `${productId} is been removed`, data: data })
        }

        // decrement quantity
        let totalAmount = findCart.totalPrice - findProduct.price
        let itemsArr = findCart.items

        for (i in itemsArr) {
            if (itemsArr[i].productId.toString() == productId) {
                itemsArr[i].quantity = itemsArr[i].quantity - 1

                if (itemsArr[i].quantity < 1) {
                    await cartModel.findOneAndUpdate({ _id: cartId }, { $pull: { items: { productId: productId } } }, { new: true })
                    let quantity = findCart.totalItems - 1

                    let data = await cartModel.findOneAndUpdate({ _id: cartId }, { $set: { totalPrice: totalAmount, totalItems: quantity } }, { new: true }) //update the cart with total items and totalprice

                    return res.status(200).send({ status: true, message: `No such quantity/product exist in cart`, data: data })
                }
            }
        }
        let data = await cartModel.findOneAndUpdate({ _id: cartId }, { items: itemsArr, totalPrice: totalAmount }, { new: true })

        return res.status(200).send({ status: true, message: `${productId} quantity is been reduced By 1`, data: data })

    } catch (err) {
        res.status(500).send({ status: false, message: err.message })
    }
}



const getCart = async(req, res) => {
    try {
        const userId = req.params.userId
        if (!(isValid(userId))) { return res.status(400).send({ status: false, message: "userId is required" }) }

        if (!isValidObjectId(userId)) { return res.status(400).send({ status: false, message: "Valid userId is required" }) }

        const oneUser = await userModel.findOne({ _id: userId })

        if (!oneUser) { return res.status(400).send({ status: false, Data: "No data found with this userId" }) }

        const returningCart = await cartModel.find({ userId: userId })
        if (!returningCart) { return res.status(400).send({ status: false, Data: "No Items added to cart" }) }

        if (req.userId != oneUser._id) {
            res.status(401).send({ status: false, message: "Unauthorized access! You are not authorized to Get this cart details" });
            return
        }

        // let detailsOfItemsByUser={oneUser,returningCart}

        return res.status(200).send({ status: true, message: 'Success', data: returningCart })
    } catch (err) {
        return res.status(500).send({ status: false, message: err.message })
    }
}

const deleteCart = async(req, res) => {
    try {
        let userId = req.params.userId
        if (!(isValid(userId) || isValidObjId.test(userId))) {
            return res.status(400).send({ status: false, message: "ProductId is invalid" })
        }

        const cartByUserId = await cartModel.findOne({ userId: userId });

        if (!cartByUserId) {
            return res.status(404).send({
                status: false,
                message: `no cart found by ${userId}`,
            });
        }
        if (cartByUserId.userId != req.userId) {
            res.status(401).send({ status: false, message: "Unauthorized access! You are not authorized to Delete product from this cart" });
            return
        }

        if (cartByUserId.items.length === 0 || cartByUserId.totalItems === 0) {
            return res.status(400).send({
                status: false,
                message: `cart is already empty`,
            });
        }




        const makeCartEmpty = await cartModel.findOneAndUpdate({ userId: userId }, { $set: { items: [], totalPrice: 0, totalItems: 0 } }, { new: true });
        return res
            .status(200)
            .send({
                status: true,
                message: "cart made empty successfully",
                data: makeCartEmpty,
            });


    } catch (err) {
        return res.status(500).send({ status: false, message: err.message })
    }
}
module.exports = { createCart, updateCart, getCart, deleteCart }
