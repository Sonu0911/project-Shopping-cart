const CartModel = require("../models/cartModel");
const OrderModel = require("../models/orderModel");
const ProductModel = require("../models/productModel");
const UserModel = require("../models/userModel");
const mongoose = require("mongoose");

//====================================================================================


const isValidObjId = /^[0-9a-fA-F]{24}$/

const isValid = function(value) {
    if (typeof value === "undefined" || typeof value === "null") {
        return false;
    }
    if (typeof value === "string" && value.trim().length > 0) {
        return true;
    }
};

const isValidRequestBody = function(object) {
    return Object.keys(object).length > 0
}

const isValidObjectId = function(ObjectId) {
    return mongoose.Types.ObjectId.isValid(ObjectId)
}

//==========================CREATE ORDER================================================


const createOrder = async(req, res) => {
    try {
        const userId = req.params.userId;
        const requestBody = req.body;

        //validation for request body
        if (!isValidRequestBody(requestBody)) {
            return res
                .status(400)
                .send({
                    status: false,
                    message: "Invalid request body. Please provide the the input to proceed.",
                });
        }
        //Extract parameters

        const { cartId, cancellable, status } = requestBody;

        //validating userId
        if (!isValidObjId.test(userId)) {
            return res
                .status(400)
                .send({ status: false, message: "Invalid userId in params." });
        }

        const searchUser = await UserModel.findOne({ _id: userId });
        if (!searchUser) {
            return res.status(400).send({
                status: false,
                message: `user doesn't exists for ${userId}`,
            });
        }
        //Authentication & authorization
        if (searchUser._id.toString() != req.userId) {
            res.status(403).send({ status: false, message: `Unauthorized access! User's info doesn't match` });
            return
        }

        if (!cartId) {
            return res.status(400).send({
                status: false,
                message: `Cart doesn't exists for ${userId}`,
            });
        }
        if (!isValidObjId.test(cartId)) {
            return res.status(400).send({
                status: false,
                message: `Invalid cartId in request body.`,
            });
        }

        //searching cart to match the cart by userId whose is to be ordered.
        const searchCartDetails = await CartModel.findOne({
            _id: cartId,
            userId: userId,
        });
        if (!searchCartDetails) {
            return res.status(400).send({
                status: false,
                message: `Cart doesn't belongs to ${userId}`,
            });
        }

        //must be a boolean value.
        if (cancellable) {
            if (typeof cancellable != "boolean") {
                return res.status(400).send({
                    status: false,
                    message: `Cancellable must be either 'true' or 'false'.`,
                });
            }
        }

        // must be either - pending , completed or cancelled.
        if (status) {
            if (!["pending", "completed", "cancelled"].includes(status)) {
                return res.status(400).send({ status: false, message: "status should be from [pending, completed, cancelled]" })
            }
        }

        //verifying whether the cart is having any products or not.
        if (!searchCartDetails.items.length) {
            return res.status(202).send({
                status: false,
                message: `Order already placed for this cart. Please add some products in cart to make an order.`,
            });
        }

        //adding quantity of every products
        const reducer = (previousValue, currentValue) =>
            previousValue + currentValue;

        let totalQuantity = searchCartDetails.items
            .map((x) => x.quantity)
            .reduce(reducer);

        //object destructuring for response body.
        const orderDetails = {
            userId: userId,
            items: searchCartDetails.items,
            totalPrice: searchCartDetails.totalPrice,
            totalItems: searchCartDetails.totalItems,
            totalQuantity: totalQuantity,
            cancellable,
            status,
        };
        const savedOrder = await OrderModel.create(orderDetails);

        //Empty the cart after the successfull order
        await CartModel.findOneAndUpdate({ _id: cartId, userId: userId }, {
            $set: {
                items: [],
                totalPrice: 0,
                totalItems: 0,
            },
        });
        return res
            .status(200)
            .send({ status: true, message: "Order placed.", data: savedOrder });
    } catch (err) {
        return res.status(500).send({ status: false, message: err.message });
    }
};

//======================================UPDATE ORDER===============================================//


const updateOrder = async function(req, res) {
    try {
        const requestBody = req.body
        const queryParams = req.query
        const userIdFromParams = req.params.userId




        if (!isValidRequestBody(requestBody)) {
            return res.status(400).send({ status: false, message: "Order data is required " })
        }

        const { orderId, status } = requestBody

        if (Object.keys(requestBody).length > 2) {
            return res.status(400).send({ status: false, message: "invalid entries" })
        }



        if (!isValidObjectId(orderId)) {
            return res.status(400).send({ status: false, message: "invalid orderId " })
        }

        const orderDetailsByOrderId = await OrderModel.findOne({ _id: orderId, isDeleted: false, deletedAt: null })

        if (!orderDetailsByOrderId) {
            return res.status(404).send({ status: false, message: `no order found by ${orderId} ` })
        }

        if (orderDetailsByOrderId.userId.toString() !== userIdFromParams) {
            return res.status(403).send({ status: false, message: "unauthorize access: order is not of this user" })
        }

        if (!["pending", "completed", "cancelled"].includes(status)) {
            return res.status(400).send({ status: false, message: "status should be from [pending, completed, cancelled]" })
        }

        if (orderDetailsByOrderId.status === "completed") {
            return res.status(400).send({ status: false, message: "Order completed, now its status can not be updated" })
        }

        if (status === "cancelled" && orderDetailsByOrderId.cancellable === false) {
            return res.status(400).send({ status: false, message: "This order can not be cancelled" })
        }

        if (status === "pending") {
            return res.status(400).send({ status: false, message: "order status is already pending" })
        }

        const updateStatus = await OrderModel.findOneAndUpdate({ _id: orderId }, { $set: { status: status } }, { new: true })

        res.status(200).send({ status: true, message: "order status updated", data: updateStatus })

    } catch (error) {
        res.status(500).send({ error: error.message })
    }
}


module.exports = { createOrder, updateOrder }
module.exports = { createOrder, updateOrder }
