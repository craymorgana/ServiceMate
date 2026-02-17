const {
  AuthenticationError,
  UserInputError,
} = require("apollo-server-express");
const { signToken } = require("../utils/auth");
const { User, Vehicle, Service } = require("../models");

const resolvers = {
  Query: {
    //Fetch all vehicles for a user
    vehicles: async (parent, args, context) => {
      if (!context.user) {
        throw new AuthenticationError("Not logged in");
      }
      const vehicles = await Vehicle.find({
        userId: context.user._id,
      }).populate("service");
      return vehicles;
    },

    //Get vehicle by Id
    vehicle: async (parent, { vehicleId }) => {
      if (!vehicleId) {
        throw new AuthenticationError("No vehicle with this ID");
      }
      const vehicle = await Vehicle.findById(vehicleId).populate("service");
      return vehicle;
    },

    user: async (parent, { username }) => {
      return User.findOne({ username }).populate("vehicles");
    },

    me: async (parent, args, context) => {
      if (context.user) {
        return User.findOne({ _id: context.user._id }).populate("vehicles");
      }
      throw new AuthenticationError("You need to be logged in!");
    },

    //Fetch all service for a vehicle
    service: async (parent, { vehicleId }) => {
      const service = await Service.find({ vehicleId });
      return service;
    },
  },
  //Add Vehicle to a users id
  Mutation: {
    addVehicle: async (_parent, { vehicleTitle }, context) => {
      console.log(vehicleTitle);
      if (context.user) {
        const vehicle = await Vehicle.create({
          vehicleTitle: vehicleTitle,
          userId: context.user._id,
        });
        console.log(vehicle._id);
        await User.findByIdAndUpdate(
          { _id: context.user._id },
          { $addToSet: { vehicles: vehicle._id } }
        );
        return vehicle;
      }
      throw new AuthenticationError("Not logged in");
    },
    //add service to a vehicle
    addService: async (
      parent,
      { vehicleId, serviceType, serviceDescription, mileage, columnId },
      context
    ) => {
      if (!context.user) {
        throw new AuthenticationError("Not logged in");
      }
      const addService = await Service.create({
        vehicleId,
        serviceType,
        serviceDescription,
        mileage,
        columnId,
      });
      await Vehicle.findByIdAndUpdate(
        { _id: vehicleId },
        { $addToSet: { service: addService._id } }
      );
      return addService;
    },
    login: async (parent, { email, password }) => {
      const user = await User.findOne({ email });

      if (!user) {
        throw new AuthenticationError("No user found with this email address");
      }

      const correctPw = await user.isCorrectPassword(password);

      if (!correctPw) {
        throw new AuthenticationError("Incorrect credentials");
      }

      const token = signToken(user);

      return { token, user };
    },
    addUser: async (parent, { username, email, password }) => {
      const user = await User.create({ username, email, password });
      const token = signToken(user);
      return { token, user };
    },
  },
};

module.exports = resolvers;
