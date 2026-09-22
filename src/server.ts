import app from './app';
import { env } from './config/env';

app.listen(env.PORT, () => {
    console.log(`Server is running at http://localhost:${env.PORT}`);
});
