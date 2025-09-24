import mongoose from "mongoose";

export const connectdb =async function() {
    await mongoose.connect('mongodb+srv://leocoin4737_db_user:6h6SldC4QKbDlE9v@cluster0.0djvjlk.mongodb.net/DevTinder');
}
    

