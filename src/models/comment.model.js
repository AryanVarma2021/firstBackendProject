import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

import mongoose, {Schema, mongo} from "mongoose";


const commentSchema = new Schema({
    owner : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "User",
        required : true,

    },
    content : {
        type : String,
        required : true
    },
    video : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "Video",
        required : true
    }
}, {timestamps : true})

commentSchema.plugin(mongooseAggregatePaginate)

export const Comment = mongoose.model("Comment", commentSchema)